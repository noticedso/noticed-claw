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

export const SILENT_TOKENS = ["NO_REPLY", "HEARTBEAT_OK"] as const;

export function isSilentReply(text: string): boolean {
  const trimmed = text.trim().substring(0, 20);
  return SILENT_TOKENS.some((token) => trimmed === token);
}

function convertMessages(messages: Message[]): CoreMessage[] {
  return messages
    .filter((m) => !m.compactedAt)
    .map((m) => ({
      role: m.role === "tool" ? "assistant" : m.role,
      content: m.content,
    })) as CoreMessage[];
}

export async function runAgentTurnStreaming(
  input: AgentTurnInput
): Promise<Response> {
  const supabase = createServerClient();

  // Resolve context
  const ctx = await resolveAgentContext(supabase, input);

  // Build tools for prompt (descriptions only)
  const builtinTools = getAllBuiltinTools();
  const resolvedTools = resolveTools(
    builtinTools,
    "standard",
    ctx.tenant.config.toolPolicy
  );

  const systemPrompt = buildSystemPrompt(ctx, "full", resolvedTools);
  const coreMessages = convertMessages(ctx.messages);
  coreMessages.push({ role: "user", content: input.userMessage });

  const modelId = ctx.tenant.config.model ?? "gpt-4o-mini";

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

  // Store user message
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
      // Post-turn: store assistant message
      if (event.text) {
        const { error } = await supabase.from("messages").insert({
          session_id: ctx.session.id,
          role: "assistant",
          content: event.text,
          token_count: Math.ceil(event.text.length / 4),
        });
        if (error) console.error("Failed to store message:", error);
      }
    },
  });

  return result.toDataStreamResponse();
}
