import { streamText, tool, type CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { AgentTurnInput, AgentContext, Message } from "./types";
import { resolveAgentContext } from "./agent-router";
import { buildSystemPrompt } from "./prompt-builder";
import { resolveTools } from "./tools/registry";
import { getAllBuiltinTools } from "./tools";
import { searchCapabilities, CAPABILITIES } from "./tools/capability-registry";
import { createServerClient } from "@/supabase/client";
import { extractTurnMemories } from "./memory-extract";
import { shouldCompact, compactSession } from "./compaction";
import { shouldRunMemoryFlush, runMemoryFlush } from "./memory-flush";
import { upsertSessionSummary } from "./session-awareness";

// ---------------------------------------------------------------------------
// Silent-token detection
// ---------------------------------------------------------------------------

export const SILENT_TOKENS = ["NO_REPLY", "HEARTBEAT_OK"] as const;

export function isSilentReply(text: string): boolean {
  const trimmed = text.trim().substring(0, 20);
  return SILENT_TOKENS.some((token) => trimmed === token);
}

// ---------------------------------------------------------------------------
// Tool status formatting (brief human-readable labels)
// ---------------------------------------------------------------------------

function formatToolStatus(toolName: string, args: Record<string, unknown>): string {
  if (toolName === "search") {
    return `searching capabilities for "${args.query}"...`;
  }
  if (toolName === "execute") {
    const capName = args.name as string;
    const capArgs = (args.args ?? {}) as Record<string, unknown>;
    switch (capName) {
      case "fs_ls": return `listing ${capArgs.path || "/"}...`;
      case "fs_read": return `reading ${capArgs.path || "file"}...`;
      case "fs_grep": return `searching for "${capArgs.pattern || "pattern"}"...`;
      case "memory_search": return "searching memories...";
      case "workspace_write": return `updating ${capArgs.file || "file"}...`;
      case "web_search": return "searching the web...";
      case "web_fetch": return "fetching URL...";
      case "cron": return "managing cron jobs...";
      default: return `executing ${capName}...`;
    }
  }
  return `${toolName}...`;
}

// ---------------------------------------------------------------------------
// Streaming response with:
//   1. Silent-token buffering (suppress NO_REPLY/HEARTBEAT_OK)
//   2. Tool progress annotations (tool-status events)
//   3. LLM-based memory extraction (post-turn)
//   4. Pre-compaction memory flush (post-turn)
// ---------------------------------------------------------------------------

export async function runAgentTurnStreaming(
  input: AgentTurnInput,
  clientMessages?: Array<{ role: string; content: string }>
): Promise<Response> {
  const supabase = createServerClient();
  const ctx = await resolveAgentContext(supabase, input);

  // Build tools
  const builtinTools = getAllBuiltinTools();
  const resolvedTools = resolveTools(builtinTools, "standard", ctx.tenant.config.toolPolicy);
  const systemPrompt = buildSystemPrompt(ctx, "full", resolvedTools);

  // Build message history
  let coreMessages: CoreMessage[];
  if (clientMessages && clientMessages.length > 0) {
    coreMessages = clientMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  } else {
    coreMessages = ctx.messages
      .filter((m) => !m.compactedAt)
      .map((m) => ({
        role: (m.role === "tool" ? "assistant" : m.role) as "user" | "assistant" | "system",
        content: m.content,
      }));
    coreMessages.push({ role: "user", content: input.userMessage });
  }

  const modelId = ctx.tenant.config.model ?? "gpt-4o";

  // Zod-based tools for AI SDK streamText
  const streamTools = {
    search: tool({
      description: "search available capabilities by keyword. returns names, descriptions, and parameter schemas.",
      parameters: z.object({
        query: z.string().describe("search keywords"),
        category: z.string().optional().describe("optional category filter"),
      }),
      execute: async ({ query, category }) => {
        let caps = CAPABILITIES;
        if (category) caps = caps.filter((c) => c.category === category);
        return searchCapabilities(caps, query, 5).map((r) => ({
          name: r.name, description: r.description, category: r.category,
        }));
      },
    }),
    execute: tool({
      description: "execute a capability by exact name with arguments",
      parameters: z.object({
        name: z.string().describe("capability name"),
        args: z.record(z.unknown()).optional().describe("capability arguments"),
      }),
      execute: async ({ name, args }) => {
        const t = resolvedTools.find((t) => t.name === name);
        if (!t) return { error: `capability not found: ${name}` };
        try {
          return await t.execute(args ?? {}, ctx);
        } catch (err) {
          return { error: String(err) };
        }
      },
    }),
  };

  // Store user message in DB
  await supabase.from("messages").insert({
    session_id: ctx.session.id,
    role: "user",
    content: input.userMessage,
    token_count: Math.ceil(input.userMessage.length / 4),
  });

  // --- Custom streaming with silent-token buffering + tool progress ---
  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = streamText({
          model: openai(modelId),
          system: systemPrompt,
          messages: coreMessages,
          tools: streamTools,
          maxSteps: 10,
        });

        let buffer = "";
        let flushed = false;
        let silentDetected = false;

        for await (const part of result.fullStream) {
          if (silentDetected) continue;

          switch (part.type) {
            case "text-delta": {
              if (!flushed) {
                // Buffer initial text for silent-token detection
                buffer += part.textDelta;
                if (buffer.length >= 20) {
                  if (isSilentReply(buffer)) {
                    silentDetected = true;
                    controller.close();
                    return;
                  }
                  flushed = true;
                  fullText += buffer;
                  controller.enqueue(encoder.encode(`0:${JSON.stringify(buffer)}\n`));
                }
              } else {
                fullText += part.textDelta;
                controller.enqueue(encoder.encode(`0:${JSON.stringify(part.textDelta)}\n`));
              }
              break;
            }

            case "tool-call": {
              // Emit tool progress annotation
              const status = formatToolStatus(part.toolName, part.args as Record<string, unknown>);
              controller.enqueue(
                encoder.encode(`8:${JSON.stringify([{ type: "tool-status", text: status }])}\n`)
              );
              break;
            }

            case "tool-result": {
              controller.enqueue(
                encoder.encode(`8:${JSON.stringify([{ type: "tool-status", text: "done" }])}\n`)
              );
              break;
            }

            case "step-finish": {
              // Paragraph break between tool-use steps and text
              if (flushed) fullText += "\n\n";
              break;
            }

            case "finish": {
              // Flush remaining buffer
              if (!flushed && buffer.length > 0) {
                if (isSilentReply(buffer)) {
                  silentDetected = true;
                  controller.close();
                  return;
                }
                flushed = true;
                fullText += buffer;
                controller.enqueue(encoder.encode(`0:${JSON.stringify(buffer)}\n`));
              }
              // Send finish metadata
              controller.enqueue(
                encoder.encode(`d:${JSON.stringify({ finishReason: part.finishReason, usage: part.usage })}\n`)
              );
              break;
            }
          }
        }

        controller.close();

        // Post-stream: store message + fire-and-forget hooks
        if (fullText && !silentDetected) {
          await supabase.from("messages").insert({
            session_id: ctx.session.id,
            role: "assistant",
            content: fullText,
            token_count: Math.ceil(fullText.length / 4),
          });

          postTurnHooks(supabase, ctx, input.userMessage, fullText).catch(
            (err) => console.error("Post-turn hooks error:", err)
          );
        }
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  });
}

// ---------------------------------------------------------------------------
// Post-turn hooks (fire-and-forget)
// ---------------------------------------------------------------------------

async function postTurnHooks(
  supabase: ReturnType<typeof createServerClient>,
  ctx: AgentContext,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  // 1. LLM-based memory extraction — structured facts with categories + dedup
  try {
    const { stored } = await extractTurnMemories({
      supabase,
      tenantId: ctx.tenant.id,
      sessionId: ctx.session.id,
      userMessage,
      assistantMessage: assistantResponse,
      channel: ctx.session.channel,
    });
    if (stored > 0) console.log(`Extracted ${stored} memories for tenant ${ctx.tenant.id}`);
  } catch (err) {
    console.error("Memory extraction failed:", err);
  }

  // 2. Pre-compaction memory flush — extract durable facts before messages get compacted
  const estimatedNewTokens = Math.ceil((userMessage.length + assistantResponse.length) / 4);
  const newTotalTokens = ctx.session.totalTokens + estimatedNewTokens;

  if (shouldRunMemoryFlush(newTotalTokens)) {
    try {
      const { data: allMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", ctx.session.id)
        .is("compacted_at", null)
        .order("created_at", { ascending: true });

      if (allMessages && allMessages.length > 0) {
        const mapped: Message[] = allMessages.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          sessionId: m.session_id as string,
          role: m.role as Message["role"],
          content: m.content as string,
          tokenCount: (m.token_count as number) ?? 0,
          compactedAt: null,
          createdAt: m.created_at as string,
        }));

        const { stored } = await runMemoryFlush({
          supabase,
          tenantId: ctx.tenant.id,
          sessionId: ctx.session.id,
          messages: mapped,
          timezone: ctx.tenant.config.timezone,
        });
        if (stored > 0) console.log(`Memory flush stored ${stored} memories before compaction`);
      }
    } catch (err) {
      console.error("Memory flush failed:", err);
    }
  }

  // 3. Compaction (after flush to avoid info loss)
  if (shouldCompact(newTotalTokens)) {
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", ctx.session.id)
        .is("compacted_at", null)
        .order("created_at", { ascending: true });

      if (messages && messages.length > 0) {
        const mapped: Message[] = messages.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          sessionId: m.session_id as string,
          role: m.role as Message["role"],
          content: m.content as string,
          tokenCount: (m.token_count as number) ?? 0,
          compactedAt: null,
          createdAt: m.created_at as string,
        }));
        const { generateText } = await import("ai");
        const summarizeFn = async (text: string) => {
          const result = await generateText({
            model: openai("gpt-4o-mini"),
            system: "Summarize concisely. Preserve: active tasks, decisions, TODOs, key identifiers.",
            messages: [{ role: "user" as const, content: text }],
          });
          return result.text;
        };
        await compactSession(supabase, ctx.session.id, mapped, summarizeFn);
      }
    } catch (err) {
      console.error("Compaction failed:", err);
    }
  }

  // 4. Session summary upsert
  try {
    const summaryText = `discussed: ${assistantResponse.substring(0, 200)}`;
    await upsertSessionSummary(supabase, ctx.tenant.id, ctx.session.id, summaryText, "recent_messages", 0);
  } catch (err) {
    console.error("Session summary upsert failed:", err);
  }
}
