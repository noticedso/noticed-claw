import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionSummaryWithSession } from "./types";

export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatSessionAwareness(summaries: SessionSummaryWithSession[]): string {
  if (summaries.length === 0) return "no other active sessions";
  return summaries
    .map(
      (s) =>
        `- ${s.session.channel}/${s.session.chatType}: ${s.summary} (last active ${formatRelativeTime(s.session.updatedAt)})`
    )
    .join("\n");
}

export async function getSessionSummaries(
  supabase: SupabaseClient,
  tenantId: string,
  excludeSessionId: string
): Promise<SessionSummaryWithSession[]> {
  const { data, error } = await supabase
    .from("session_summaries")
    .select("*, sessions!inner(channel, chat_type, updated_at)")
    .eq("tenant_id", tenantId)
    .neq("session_id", excludeSessionId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const session = row.sessions as Record<string, unknown>;
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      sessionId: row.session_id as string,
      summary: row.summary as string,
      source: row.source as "recent_messages" | "compaction",
      messageCount: row.message_count as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      session: {
        channel: session.channel as string,
        chatType: session.chat_type as string,
        updatedAt: session.updated_at as string,
      },
    };
  });
}

export async function upsertSessionSummary(
  supabase: SupabaseClient,
  tenantId: string,
  sessionId: string,
  summary: string,
  source: "recent_messages" | "compaction",
  messageCount: number
): Promise<void> {
  const { error } = await supabase.from("session_summaries").upsert(
    {
      tenant_id: tenantId,
      session_id: sessionId,
      summary,
      source,
      message_count: messageCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );
  if (error) throw error;
}
