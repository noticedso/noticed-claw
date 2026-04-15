import { generateText, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cosineSimilarity, SUPERSEDE_THRESHOLD } from "./memory-manager";
import type { MemoryCategory } from "./types";

const SILENT_TOKENS = new Set(["NO_REPLY", "HEARTBEAT_OK"]);
const SKIP_CHANNELS = new Set(["heartbeat", "cron"]);

export function shouldExtractMemories(params: {
  userMessage: string;
  assistantMessage: string;
  channel?: string | null;
}): boolean {
  const { userMessage, assistantMessage, channel } = params;
  if (SILENT_TOKENS.has(assistantMessage.trim())) return false;
  if (channel && SKIP_CHANNELS.has(channel)) return false;
  if (userMessage.trim().length < 10 && assistantMessage.trim().length < 50) return false;
  return true;
}

interface ExtractedFact {
  content: string;
  category: MemoryCategory;
  confidence: number;
}

const EXTRACTION_PROMPT = [
  "Extract durable facts from this single exchange that are worth remembering across sessions.",
  'Return strict JSON: {"facts":[{"content":"...","category":"preference|decision|fact|commitment|milestone","confidence":0.0-1.0}]}',
  "",
  "Only include facts worth persisting long-term:",
  "- User preferences, habits, or recurring patterns",
  "- Decisions made or commitments given",
  "- Important factual information (names, roles, projects, dates)",
  "- Milestones reached or goals set",
  "",
  "Do NOT include:",
  "- Greetings, small talk, or transient requests",
  "- Information already obvious from the conversation context",
  "- Tool execution details or system responses",
  "",
  'If nothing is worth storing, return {"facts":[]}',
].join("\n");

export async function extractTurnMemories(params: {
  supabase: SupabaseClient;
  tenantId: string;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
  channel?: string;
}): Promise<{ stored: number }> {
  const { supabase, tenantId, sessionId, userMessage, assistantMessage } = params;

  if (
    !shouldExtractMemories({
      userMessage,
      assistantMessage,
      channel: params.channel,
    })
  ) {
    return { stored: 0 };
  }

  const transcript = `USER: ${userMessage}\n\nASSISTANT: ${assistantMessage}`;
  const prompt = `${EXTRACTION_PROMPT}\n\nExchange:\n${transcript}`;

  // LLM extraction call (use gpt-4o-mini to keep costs low)
  let response: string;
  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [{ role: "user", content: prompt }],
    });
    response = result.text;
  } catch (err) {
    console.error("Memory extraction LLM call failed:", err);
    return { stored: 0 };
  }

  if (!response.trim() || response.trim() === "NO_REPLY") {
    return { stored: 0 };
  }

  // Parse extracted facts
  let facts: ExtractedFact[] = [];
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    facts = Array.isArray(parsed?.facts) ? parsed.facts : [];
  } catch {
    return { stored: 0 };
  }

  let stored = 0;
  for (const fact of facts) {
    if (!fact || typeof fact !== "object") continue;
    const content = typeof fact.content === "string" ? fact.content.trim() : "";
    if (!content) continue;

    const confidence = typeof fact.confidence === "number" ? fact.confidence : 0.5;
    if (confidence < 0.6) continue;

    const category = (
      ["preference", "decision", "fact", "commitment", "milestone"].includes(fact.category)
        ? fact.category
        : "fact"
    ) as MemoryCategory;

    // Embed the fact
    let factEmbedding: number[];
    try {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: content,
      });
      factEmbedding = embedding;
    } catch {
      continue;
    }

    // Dedup check — find near-duplicates
    const { data: existing } = await supabase.rpc("match_memories", {
      query_embedding: factEmbedding,
      match_count: 1,
      tenant: tenantId,
      min_score: SUPERSEDE_THRESHOLD,
    });

    if (existing && existing.length > 0) {
      // Supersede the old memory
      const oldId = existing[0].id;
      const { data: newMem } = await supabase
        .from("memories")
        .insert({
          tenant_id: tenantId,
          content,
          memory_type: "curated",
          embedding: factEmbedding,
          category,
          status: "active",
          confidence,
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
      // New memory
      await supabase.from("memories").insert({
        tenant_id: tenantId,
        content,
        memory_type: "curated",
        embedding: factEmbedding,
        category,
        status: "active",
        confidence,
        session_id: sessionId,
      });
    }

    stored++;
  }

  return { stored };
}
