// src/lib/agent/session-manager.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "./types";

/**
 * Build a deterministic session key from tenant, channel, chat type, and peer ID.
 * Format: tenant:<tenantId>:<channel>:<chatType>:<peerId>
 */
export function buildSessionKey(
  tenantId: string,
  channel: string,
  chatType: string,
  peerId: string
): string {
  return `tenant:${tenantId}:${channel}:${chatType}:${peerId}`;
}

/**
 * Parse a session key back into its components.
 * Handles peerId containing colons by joining everything after the 4th colon.
 */
export function parseSessionKey(key: string): {
  tenantId: string;
  channel: string;
  chatType: string;
  peerId: string;
} {
  const parts = key.split(":");
  return {
    tenantId: parts[1],
    channel: parts[2],
    chatType: parts[3],
    peerId: parts.slice(4).join(":"),
  };
}

/**
 * Get an existing session by key or create a new one.
 */
export async function getOrCreateSession(
  supabase: SupabaseClient,
  tenantId: string,
  sessionKey: string,
  channel: string,
  chatType: string
): Promise<Session> {
  // Try to find existing session
  const { data: existing } = await supabase
    .from("sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("session_key", sessionKey)
    .single();

  if (existing) {
    return {
      id: existing.id,
      tenantId: existing.tenant_id,
      sessionKey: existing.session_key,
      channel: existing.channel,
      chatType: existing.chat_type,
      totalTokens: existing.total_tokens,
      inputTokens: existing.input_tokens,
      outputTokens: existing.output_tokens,
      compactionCount: existing.compaction_count,
      metadata: existing.metadata,
      createdAt: existing.created_at,
      updatedAt: existing.updated_at,
    };
  }

  // Create new session
  const { data: created, error } = await supabase
    .from("sessions")
    .insert({
      tenant_id: tenantId,
      session_key: sessionKey,
      channel,
      chat_type: chatType,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);

  return {
    id: created.id,
    tenantId: created.tenant_id,
    sessionKey: created.session_key,
    channel: created.channel,
    chatType: created.chat_type,
    totalTokens: created.total_tokens,
    inputTokens: created.input_tokens,
    outputTokens: created.output_tokens,
    compactionCount: created.compaction_count,
    metadata: created.metadata,
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  };
}

/**
 * Update token counts on a session after a turn completes.
 */
export async function updateSessionTokens(
  supabase: SupabaseClient,
  sessionId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const { error } = await supabase.rpc("update_session_tokens", {
    p_session_id: sessionId,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
  });

  // Fallback: direct update if RPC doesn't exist
  if (error) {
    await supabase
      .from("sessions")
      .update({
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  }
}
