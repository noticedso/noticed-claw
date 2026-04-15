import type { AgentTurnInput, AgentTurnResult } from "./types";
import { createServerClient } from "@/supabase/client";
import { resolveAgentContext } from "./agent-router";
import { buildSystemPrompt } from "./prompt-builder";
import { runLLM } from "./llm-runner";
import { isSilentReply } from "./stream-bridge";
import { resolveTools } from "./tools/registry";
import { getAllBuiltinTools } from "./tools";
import { getCodeModeTools } from "./tools/code-mode";
import { shouldCompact, compactSession } from "./compaction";
import { extractAndStoreMemories } from "./memory-manager";
import { upsertSessionSummary } from "./session-awareness";
import { enqueueMessage, acquireThreadLock } from "./thread-queue";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function runAgentTurn(
  input: AgentTurnInput
): Promise<AgentTurnResult> {
  const supabase = createServerClient();

  // 1. Thread queue dedupe
  if (input.dedupeKey) {
    const isNew = await enqueueMessage(
      supabase,
      input.sessionKey,
      input.dedupeKey,
      { userMessage: input.userMessage }
    );
    if (!isNew) {
      return { content: null, silent: true, sessionId: "", tokens: { input: 0, output: 0, total: 0 } };
    }

    const hasLock = await acquireThreadLock(supabase, input.sessionKey);
    if (!hasLock) {
      return { content: null, silent: true, sessionId: "", tokens: { input: 0, output: 0, total: 0 } };
    }
  }

  // 2. Resolve context
  const ctx = await resolveAgentContext(supabase, input);

  // 3. Build tools
  const builtinTools = getAllBuiltinTools();
  const resolvedTools = resolveTools(
    builtinTools,
    "standard",
    ctx.tenant.config.toolPolicy
  );

  const executeCapability = async (
    name: string,
    args: Record<string, unknown>,
    _capCtx: typeof ctx
  ) => {
    const tool = resolvedTools.find((t) => t.name === name);
    if (!tool) throw new Error(`capability not found: ${name}`);
    return tool.execute(args, ctx);
  };

  const codeModeTools = getCodeModeTools(executeCapability);
  const allTools = [...codeModeTools];

  // 4. Build system prompt
  const systemPrompt = buildSystemPrompt(ctx, "full", resolvedTools);

  // 5. Store user message
  await supabase.from("messages").insert({
    session_id: ctx.session.id,
    role: "user",
    content: input.userMessage,
    token_count: Math.ceil(input.userMessage.length / 4),
  });

  // 6. Run LLM
  const result = await runLLM(systemPrompt, ctx.messages, allTools, ctx);

  // 7. Silent check
  if (isSilentReply(result.content)) {
    return {
      content: null,
      silent: true,
      sessionId: ctx.session.id,
      tokens: {
        input: result.tokens.input,
        output: result.tokens.output,
        total: result.tokens.input + result.tokens.output,
      },
    };
  }

  // 8. Store assistant message
  await supabase.from("messages").insert({
    session_id: ctx.session.id,
    role: "assistant",
    content: result.content,
    tool_calls: result.toolCalls.length > 0 ? result.toolCalls : null,
    token_count: Math.ceil(result.content.length / 4),
  });

  // 9. Update session tokens
  const totalTokens = result.tokens.input + result.tokens.output;
  await supabase
    .from("sessions")
    .update({
      total_tokens: ctx.session.totalTokens + totalTokens,
      input_tokens: ctx.session.inputTokens + result.tokens.input,
      output_tokens: ctx.session.outputTokens + result.tokens.output,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.session.id);

  // 10. Post-turn hooks (fire-and-forget)
  postTurnHooks(supabase, ctx, result.content).catch((err) =>
    console.error("Post-turn hooks error:", err)
  );

  return {
    content: result.content,
    silent: false,
    sessionId: ctx.session.id,
    tokens: {
      input: result.tokens.input,
      output: result.tokens.output,
      total: totalTokens,
    },
  };
}

async function postTurnHooks(
  supabase: ReturnType<typeof createServerClient>,
  ctx: Awaited<ReturnType<typeof resolveAgentContext>>,
  content: string
): Promise<void> {
  // Memory extraction
  try {
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
      content,
      embedFn
    );
  } catch (err) {
    console.error("Memory extraction failed:", err);
  }

  // Compaction check
  const newTotalTokens = ctx.session.totalTokens + Math.ceil(content.length / 4);
  if (shouldCompact(newTotalTokens)) {
    try {
      const summarizeFn = async (text: string) => {
        const result = await generateText({
          model: openai("gpt-4o-mini"),
          system:
            "Summarize the following conversation concisely. Preserve: active tasks, decisions, TODOs, key identifiers. Be brief.",
          messages: [{ role: "user", content: text }],
        });
        return result.text;
      };
      await compactSession(supabase, ctx.session.id, ctx.messages, summarizeFn);
    } catch (err) {
      console.error("Compaction failed:", err);
    }
  }

  // Session summary upsert
  try {
    const summaryText = `discussed: ${content.substring(0, 200)}`;
    await upsertSessionSummary(
      supabase,
      ctx.tenant.id,
      ctx.session.id,
      summaryText,
      "recent_messages",
      ctx.messages.length + 2
    );
  } catch (err) {
    console.error("Session summary upsert failed:", err);
  }
}
