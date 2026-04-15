import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "./types";

export async function searchMessages(
  supabase: SupabaseClient,
  tenantId: string,
  query: string,
  limit: number = 20
): Promise<Message[]> {
  // Get all session IDs for this tenant
  const { data: sessions, error: sessErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("tenant_id", tenantId);

  if (sessErr) throw sessErr;
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s: { id: string }) => s.id);

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("session_id", sessionIds)
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapMessageRow);
}

export async function browseSession(
  supabase: SupabaseClient,
  sessionId: string,
  offset: number = 0,
  limit: number = 50
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .is("compacted_at", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []).map(mapMessageRow);
}

function mapMessageRow(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    role: row.role as Message["role"],
    content: row.content as string,
    toolCalls: row.tool_calls as Message["toolCalls"],
    toolResults: row.tool_results as Message["toolResults"],
    tokenCount: (row.token_count as number) ?? 0,
    compactedAt: (row.compacted_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}
