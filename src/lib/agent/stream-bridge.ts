import { streamText, type CoreMessage, type CoreTool } from "ai";
import { openai } from "@ai-sdk/openai";
import type { AgentTurnInput, ToolDefinition, AgentContext, Message } from "./types";
import { resolveAgentContext } from "./agent-router";
import { buildSystemPrompt } from "./prompt-builder";
import { resolveTools } from "./tools/registry";
import { getAllBuiltinTools } from "./tools";
import { getCodeModeTools } from "./tools/code-mode";
import { MAX_TOOL_ITERATIONS } from "./llm-runner";
import { createServerClient } from "@/supabase/client";

export const SILENT_TOKENS = ["NO_REPLY", "HEARTBEAT_OK"] as const;

export function isSilentReply(text: string): boolean {
  const trimmed = text.trim().substring(0, 20);
  return SILENT_TOKENS.some((token) => trimmed === token);
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
        return tool.execute(args, ctx);
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

export async function runAgentTurnStreaming(
  input: AgentTurnInput
): Promise<Response> {
  const supabase = createServerClient();

  // Resolve context
  const ctx = await resolveAgentContext(supabase, input);

  // Build tools
  const builtinTools = getAllBuiltinTools();
  const resolvedTools = resolveTools(
    builtinTools,
    "standard",
    ctx.tenant.config.toolPolicy
  );

  const executeCapability = async (
    name: string,
    args: Record<string, unknown>,
    capCtx: AgentContext
  ) => {
    const tool = resolvedTools.find((t) => t.name === name);
    if (!tool) throw new Error(`capability not found: ${name}`);
    return tool.execute(args, capCtx);
  };

  const codeModeTools = getCodeModeTools(executeCapability);
  const allTools = [...codeModeTools];

  const systemPrompt = buildSystemPrompt(ctx, "full", resolvedTools);
  const aiTools = convertToAISDKTools(allTools, ctx);
  const coreMessages = convertMessages(ctx.messages);

  // Add the new user message
  coreMessages.push({ role: "user", content: input.userMessage });

  const modelId = ctx.tenant.config.model ?? "gpt-4o-mini";

  const result = streamText({
    model: openai(modelId),
    system: systemPrompt,
    messages: coreMessages,
    tools: aiTools,
    maxSteps: MAX_TOOL_ITERATIONS,
  });

  // Buffer first chunk to check for silent reply
  const textStream = result.textStream;
  let firstChunk = "";
  const reader = textStream.getReader();

  try {
    const { value, done } = await reader.read();
    if (done || !value) {
      return new Response("", { status: 200 });
    }
    firstChunk = value;

    if (isSilentReply(firstChunk)) {
      reader.releaseLock();
      return new Response("", { status: 200 });
    }
  } catch {
    return new Response("", { status: 200 });
  }

  reader.releaseLock();

  // Return the full data stream response
  return result.toDataStreamResponse();
}
