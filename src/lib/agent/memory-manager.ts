import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryRecall } from "./types";

export const SUPERSEDE_THRESHOLD = 0.92;

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function shouldSupersede(similarity: number): boolean {
  return similarity > SUPERSEDE_THRESHOLD;
}

export async function recallMemories(
  supabase: SupabaseClient,
  tenantId: string,
  queryEmbedding: number[],
  count: number = 5,
  minScore: number = 0.15
): Promise<MemoryRecall[]> {
  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    match_count: count,
    tenant: tenantId,
    min_score: minScore,
  });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    content: row.content as string,
    category: row.category as string,
    memoryType: row.memory_type as string,
    similarity: row.similarity as number,
  }));
}

export async function extractAndStoreMemories(
  supabase: SupabaseClient,
  tenantId: string,
  sessionId: string,
  turnContent: string,
  embedFn: (text: string) => Promise<number[]>
): Promise<void> {
  // In a real implementation, this would:
  // 1. Call LLM to extract memory candidates from turnContent
  // 2. Embed each candidate
  // 3. Check for duplicates via cosine similarity
  // 4. Supersede or insert

  // For now, we extract simple facts and store them
  const embedding = await embedFn(turnContent);

  // Check for near-duplicates
  const existing = await recallMemories(supabase, tenantId, embedding, 1, SUPERSEDE_THRESHOLD);

  if (existing.length > 0 && shouldSupersede(existing[0].similarity)) {
    // Supersede the existing memory
    const { error: insertError } = await supabase.from("memories").insert({
      tenant_id: tenantId,
      content: turnContent,
      memory_type: "daily",
      embedding,
      category: "fact",
      status: "active",
      confidence: 0.7,
      session_id: sessionId,
    });
    if (insertError) throw insertError;

    await supabase
      .from("memories")
      .update({ status: "superseded", superseded_by: null })
      .eq("id", existing[0].id);
  } else {
    const { error } = await supabase.from("memories").insert({
      tenant_id: tenantId,
      content: turnContent,
      memory_type: "daily",
      embedding,
      category: "fact",
      status: "active",
      confidence: 0.7,
      session_id: sessionId,
    });
    if (error) throw error;
  }
}

export async function promoteMemory(
  supabase: SupabaseClient,
  memoryId: string
): Promise<void> {
  const { error } = await supabase
    .from("memories")
    .update({ memory_type: "curated" })
    .eq("id", memoryId);
  if (error) throw error;
}
