import { generateText, tool, type CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { ToolDefinition, ToolCall, AgentContext, Message } from "./types";
import { searchCapabilities, CAPABILITIES } from "./tools/capability-registry";

export const MAX_TOOL_ITERATIONS = 10;

export interface LLMRunResult {
  content: string;
  toolCalls: ToolCall[];
  tokens: { input: number; output: number };
}

function convertMessages(messages: Message[]): CoreMessage[] {
  return messages
    .filter((m) => !m.compactedAt)
    .map((m) => ({
      role: m.role === "tool" ? "assistant" : m.role,
      content: m.content,
    })) as CoreMessage[];
}

export async function runLLM(
  systemPrompt: string,
  messages: Message[],
  tools: ToolDefinition[],
  ctx: AgentContext,
  model?: string
): Promise<LLMRunResult> {
  const modelId = model ?? ctx.tenant.config.model ?? "gpt-4o";
  const coreMessages = convertMessages(messages);

  // Build Zod-based tools (AI SDK v4 requires Zod schemas, not raw JSON Schema)
  const zodTools = {
    search: tool({
      description:
        "search available capabilities by keyword. returns names, descriptions, and parameter schemas.",
      parameters: z.object({
        query: z.string().describe("search keywords"),
        category: z.string().optional().describe("optional category filter"),
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
        const t = tools.find((t) => t.name === name);
        if (!t) {
          const available = tools.map((t) => t.name).join(", ");
          return { error: `capability not found: ${name}. available: ${available}` };
        }
        try {
          return await t.execute(args ?? {}, ctx);
        } catch (err) {
          return { error: String(err) };
        }
      },
    }),
  };

  const result = await generateText({
    model: openai(modelId),
    system: systemPrompt,
    messages: coreMessages,
    tools: zodTools,
    maxSteps: MAX_TOOL_ITERATIONS,
  });

  const allToolCalls: ToolCall[] = [];
  for (const step of result.steps ?? []) {
    for (const tc of step.toolCalls ?? []) {
      allToolCalls.push({
        id: tc.toolCallId,
        name: tc.toolName,
        args: tc.args as Record<string, unknown>,
      });
    }
  }

  return {
    content: result.text ?? "",
    toolCalls: allToolCalls,
    tokens: {
      input: result.usage?.promptTokens ?? 0,
      output: result.usage?.completionTokens ?? 0,
    },
  };
}
