import { streamText, tool, embed, generateText, type CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { AgentTurnInput, AgentContext } from "./types";
import { resolveAgentContext } from "./agent-router";
import { buildSystemPrompt } from "./prompt-builder";
import { resolveTools } from "./tools/registry";
import { getAllBuiltinTools } from "./tools";
import { searchCapabilities, CAPABILITIES } from "./tools/capability-registry";
import { createServerClient } from "@/supabase/client";
import { extractAndStoreMemories } from "./memory-manager";
import { shouldCompact, compactSession } from "./compaction";
import { upsertSessionSummary } from "./session-awareness";

export const SILENT_TOKENS = ["NO_REPLY", "HEARTBEAT_OK"] as const;

export function isSilentReply(text: string): boolean {
  const trimmed = text.trim().substring(0, 20);
  return SILENT_TOKENS.some((token) => trimmed === token);
}

export async function runAgentTurnStreaming(
  input: AgentTurnInput,
  clientMessages?: Array<{ role: string; content: string }>
): Promise<Response> {
  const supabase = createServerClient();

  // Resolve context (for tenant, session, workspace, memories, etc.)
  const ctx = await resolveAgentContext(supabase, input);

  // Build tools for prompt (descriptions only)
  const builtinTools = getAllBuiltinTools();
  const resolvedTools = resolveTools(
    builtinTools,
    "standard",
    ctx.tenant.config.toolPolicy
  );

  const systemPrompt = buildSystemPrompt(ctx, "full", resolvedTools);

  // Use client-provided messages if available (useChat pattern),
  // otherwise fall back to DB-loaded messages + new user message
  let coreMessages: CoreMessage[];
  if (clientMessages && clientMessages.length > 0) {
    coreMessages = clientMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
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

  // Build Zod-based tools for streamText (AI SDK v4 requires Zod schemas)
  const streamTools = {
    search: tool({
      description:
        "search available capabilities by keyword. returns names, descriptions, and parameter schemas.",
      parameters: z.object({
        query: z.string().describe("search keywords"),
        category: z
          .string()
          .optional()
          .describe("optional category filter"),
      }),
      execute: async ({ query, category }) => {
        let caps = CAPABILITIES;
        if (category) caps = caps.filter((c) => c.category === category);
        return searchCapabilities(caps, query, 5).map((r) => ({
          name: r.name,
          description: r.description,
          category: r.category,
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

  // Store user message in DB for dashboard visibility
  await supabase.from("messages").insert({
    session_id: ctx.session.id,
    role: "user",
    content: input.userMessage,
    token_count: Math.ceil(input.userMessage.length / 4),
  });

  const result = streamText({
    model: openai(modelId),
    system: systemPrompt,
    messages: coreMessages,
    tools: streamTools,
    maxSteps: 10,
    onFinish: async (event) => {
      if (!event.text) return;

      // 1. Store assistant message
      const { error } = await supabase.from("messages").insert({
        session_id: ctx.session.id,
        role: "assistant",
        content: event.text,
        token_count: Math.ceil(event.text.length / 4),
      });
      if (error) console.error("Failed to store message:", error);

      // 2. Fire-and-forget post-turn hooks
      postTurnHooks(supabase, ctx, input.userMessage, event.text).catch((err) =>
        console.error("Post-turn hooks error:", err)
      );
    },
  });

  return result.toDataStreamResponse();
}

async function postTurnHooks(
  supabase: ReturnType<typeof createServerClient>,
  ctx: AgentContext,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  // Memory extraction — extract facts from the conversation turn
  try {
    const turnContent = `user: ${userMessage}\nassistant: ${assistantResponse}`;
    const embedFn = async (text: string) => {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: text,
      });
      return embedding;
    };
    await extractAndStoreMemories(
      supabase,
      ctx.tenant.id,
      ctx.session.id,
      turnContent,
      embedFn
    );
  } catch (err) {
    console.error("Memory extraction failed:", err);
  }

  // Compaction check
  const estimatedNewTokens = Math.ceil((userMessage.length + assistantResponse.length) / 4);
  const newTotalTokens = ctx.session.totalTokens + estimatedNewTokens;
  if (shouldCompact(newTotalTokens)) {
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", ctx.session.id)
        .is("compacted_at", null)
        .order("created_at", { ascending: true });

      if (messages && messages.length > 0) {
        const mapped = messages.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          sessionId: m.session_id as string,
          role: m.role as "user" | "assistant" | "system" | "tool",
          content: m.content as string,
          tokenCount: (m.token_count as number) ?? 0,
          compactedAt: null,
          createdAt: m.created_at as string,
        }));
        const summarizeFn = async (text: string) => {
          const result = await generateText({
            model: openai("gpt-4o-mini"),
            system: "Summarize concisely. Preserve: active tasks, decisions, TODOs, key identifiers.",
            messages: [{ role: "user", content: text }],
          });
          return result.text;
        };
        await compactSession(supabase, ctx.session.id, mapped, summarizeFn);
      }
    } catch (err) {
      console.error("Compaction failed:", err);
    }
  }

  // Session summary upsert
  try {
    const summaryText = `discussed: ${assistantResponse.substring(0, 200)}`;
    await upsertSessionSummary(
      supabase,
      ctx.tenant.id,
      ctx.session.id,
      summaryText,
      "recent_messages",
      0
    );
  } catch (err) {
    console.error("Session summary upsert failed:", err);
  }
}
