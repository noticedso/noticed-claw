import { generateText, type CoreMessage, type CoreTool } from "ai";
import { openai } from "@ai-sdk/openai";
import type { ToolDefinition, ToolCall, AgentContext, Message } from "./types";

export const MAX_TOOL_ITERATIONS = 10;

export interface LLMRunResult {
  content: string;
  toolCalls: ToolCall[];
  tokens: { input: number; output: number };
}

function convertToAISDKTools(
  tools: ToolDefinition[],
  ctx: AgentContext
): Record<string, CoreTool> {
  const sdkTools: Record<string, CoreTool> = {};

  for (const tool of tools) {
    sdkTools[tool.name] = {
      description: tool.description,
      parameters: tool.parameters as CoreTool["parameters"],
      execute: async (args: Record<string, unknown>) => {
        const result = await tool.execute(args, ctx);
        return result;
      },
    };
  }

  return sdkTools;
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
  const modelId = model ?? ctx.tenant.config.model ?? "gpt-4o-mini";
  const aiTools = convertToAISDKTools(tools, ctx);
  const coreMessages = convertMessages(messages);

  const result = await generateText({
    model: openai(modelId),
    system: systemPrompt,
    messages: coreMessages,
    tools: aiTools,
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
