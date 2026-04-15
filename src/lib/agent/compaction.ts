import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message, CompactionSummary } from "./types";

export const COMPACTION_TOKEN_THRESHOLD = 48000;
export const CHUNK_TOKEN_LIMIT = 8000;

export function shouldCompact(totalTokens: number): boolean {
  return totalTokens > COMPACTION_TOKEN_THRESHOLD;
}

export function chunkMessages(messages: Message[], tokenLimit: number): Message[][] {
  if (messages.length === 0) return [];

  const chunks: Message[][] = [];
  let currentChunk: Message[] = [];
  let currentTokens = 0;

  for (const msg of messages) {
    if (currentTokens + msg.tokenCount > tokenLimit && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [msg];
      currentTokens = msg.tokenCount;
    } else {
      currentChunk.push(msg);
      currentTokens += msg.tokenCount;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export async function compactSession(
  supabase: SupabaseClient,
  sessionId: string,
  messages: Message[],
  summarizeFn: (text: string) => Promise<string>
): Promise<CompactionSummary> {
  const chunks = chunkMessages(messages, CHUNK_TOKEN_LIMIT);
  const summaries: string[] = [];

  for (const chunk of chunks) {
    const text = chunk.map((m) => `${m.role}: ${m.content}`).join("\n");
    const summary = await summarizeFn(text);
    summaries.push(summary);
  }

  const fullSummary = summaries.join("\n\n---\n\n");
  const totalTokensBefore = messages.reduce((sum, m) => sum + m.tokenCount, 0);

  // Store compaction summary
  const { data, error } = await supabase
    .from("compaction_summaries")
    .insert({
      session_id: sessionId,
      summary: fullSummary,
      messages_summarized: messages.length,
      tokens_before: totalTokensBefore,
      tokens_after: Math.ceil(fullSummary.length / 4), // rough estimate
    })
    .select()
    .single();

  if (error) throw error;

  // Mark messages as compacted
  const messageIds = messages.map((m) => m.id);
  const now = new Date().toISOString();
  await supabase
    .from("messages")
    .update({ compacted_at: now })
    .in("id", messageIds);

  // Update session compaction count
  try {
    await supabase.rpc("increment_compaction_count", { sid: sessionId });
  } catch {
    // Fallback if RPC doesn't exist
    await supabase
      .from("sessions")
      .update({ compaction_count: 1 }) // simplified
      .eq("id", sessionId);
  }

  return {
    id: data.id,
    sessionId,
    summary: fullSummary,
    messagesSummarized: messages.length,
    tokensBefore: totalTokensBefore,
    tokensAfter: Math.ceil(fullSummary.length / 4),
    createdAt: data.created_at,
  };
}

export async function getLatestCompactionSummary(
  supabase: SupabaseClient,
  sessionId: string
): Promise<CompactionSummary | null> {
  const { data, error } = await supabase
    .from("compaction_summaries")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    sessionId: data.session_id,
    summary: data.summary,
    messagesSummarized: data.messages_summarized,
    tokensBefore: data.tokens_before,
    tokensAfter: data.tokens_after,
    createdAt: data.created_at,
  };
}
