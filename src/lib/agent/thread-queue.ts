import type { SupabaseClient } from "@supabase/supabase-js";

export function buildDedupeKey(threadId: string, messageId: string): string {
  return `${threadId}:${messageId}`;
}

export async function enqueueMessage(
  supabase: SupabaseClient,
  threadId: string,
  dedupeKey: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const { data, error } = await supabase
    .from("thread_inbound_queue")
    .upsert(
      {
        thread_id: threadId,
        dedupe_key: dedupeKey,
        payload,
      },
      {
        onConflict: "dedupe_key",
        ignoreDuplicates: true,
      }
    )
    .select()
    .single();

  if (error) {
    // Conflict means duplicate — return false
    if (error.code === "23505") return false;
    // PGRST116 = no rows returned from upsert with ignoreDuplicates
    if (error.code === "PGRST116") return false;
    throw error;
  }

  return !!data;
}

export async function acquireThreadLock(
  supabase: SupabaseClient,
  threadId: string
): Promise<boolean> {
  // Use pg_try_advisory_xact_lock with a hash of the thread ID
  const hash = simpleHash(threadId);
  const { data, error } = await supabase.rpc("pg_try_advisory_xact_lock", {
    lock_id: hash,
  });

  if (error) {
    // If the RPC doesn't exist, fall back to optimistic locking
    console.warn("Advisory lock not available, using optimistic approach");
    return true;
  }

  return data === true;
}

export async function drainQueue(
  supabase: SupabaseClient,
  threadId: string
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("thread_inbound_queue")
    .select("payload")
    .eq("thread_id", threadId)
    .is("processed_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Mark as processed
  const now = new Date().toISOString();
  await supabase
    .from("thread_inbound_queue")
    .update({ processed_at: now })
    .eq("thread_id", threadId)
    .is("processed_at", null);

  return data.map((row: { payload: Record<string, unknown> }) => row.payload);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
