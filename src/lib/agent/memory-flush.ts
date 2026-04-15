import { generateText, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "./types";
import { cosineSimilarity, SUPERSEDE_THRESHOLD } from "./memory-manager";

export const MEMORY_FLUSH_SOFT_TOKENS = 40_000;

export function shouldRunMemoryFlush(
  totalTokens: number,
  softThreshold: number = MEMORY_FLUSH_SOFT_TOKENS
): boolean {
  return totalTokens >= softThreshold;
}

export async function runMemoryFlush(params: {
  supabase: SupabaseClient;
  tenantId: string;
  sessionId: string;
  messages: Message[];
  timezone?: string;
}): Promise<{ stored: number }> {
  const { supabase, tenantId, sessionId, messages, timezone = "UTC" } = params;

  const dateStamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const flushPrompt = [
    "Extract durable memories from this conversation before compaction. Focus on multi-turn context that individual turn extraction may have missed.",
    "Return strict JSON:",
    '{"memories":[{"content":"...", "memoryType":"daily|curated"}]}',
    "Only include stable facts, decisions, user preferences, commitments, or completed milestones.",
    `Date: ${dateStamp}`,
    "If there is nothing worth storing, reply with NO_REPLY.",
    "",
    "Conversation:",
    transcript,
  ].join("\n");

  let response: string;
  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [{ role: "user", content: flushPrompt }],
    });
    response = result.text;
  } catch (err) {
    console.error("Memory flush LLM call failed:", err);
    return { stored: 0 };
  }

  if (!response.trim() || response.trim() === "NO_REPLY") {
    return { stored: 0 };
  }

  let memories: Array<{ content: string; memoryType: string }> = [];
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    memories = Array.isArray(parsed?.memories) ? parsed.memories : [];
  } catch {
    return { stored: 0 };
  }

  let stored = 0;
  for (const memory of memories) {
    if (!memory || typeof memory !== "object") continue;
    const content =
      typeof memory.content === "string" ? memory.content.trim() : "";
    if (!content) continue;

    const memoryType = memory.memoryType === "curated" ? "curated" : "daily";

    // Embed
    let memEmbedding: number[];
    try {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: content,
      });
      memEmbedding = embedding;
    } catch {
      continue;
    }

    // Dedup check
    const { data: existing } = await supabase.rpc("match_memories", {
      query_embedding: memEmbedding,
      match_count: 1,
      tenant: tenantId,
      min_score: SUPERSEDE_THRESHOLD,
    });

    if (existing && existing.length > 0) {
      // Near-duplicate exists — supersede
      const oldId = existing[0].id;
      const { data: newMem } = await supabase
        .from("memories")
        .insert({
          tenant_id: tenantId,
          content,
          memory_type: memoryType,
          embedding: memEmbedding,
          category: "fact",
          status: "active",
          confidence: 0.8,
          session_id: sessionId,
        })
        .select("id")
        .single();

      if (newMem) {
        await supabase
          .from("memories")
          .update({ status: "superseded", superseded_by: newMem.id })
          .eq("id", oldId);
      }
    } else {
      await supabase.from("memories").insert({
        tenant_id: tenantId,
        content,
        memory_type: memoryType,
        embedding: memEmbedding,
        category: "fact",
        status: "active",
        confidence: 0.8,
        session_id: sessionId,
      });
    }

    stored++;
  }

  return { stored };
}
