import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentContext,
  AgentTurnInput,
  Tenant,
  TenantConfig,
  Session,
} from "./types";
import { buildSessionKey } from "./session-manager";
import { loadWorkspaceFiles, initializeWorkspaceFiles } from "./workspace-files";
import { recallMemories } from "./memory-manager";
import { getSessionSummaries } from "./session-awareness";
import { getActiveMission, getGoals } from "./mission-engine";
import { getLatestCompactionSummary } from "./compaction";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

const DEFAULT_CONFIG: TenantConfig = {
  model: "gpt-4o",
  persona: "donna",
  heartbeatEnabled: false,
  heartbeatIntervalMs: 3600000,
  activeHoursStart: 9,
  activeHoursEnd: 21,
  timezone: "UTC",
  toolPolicy: {},
};

export async function resolveAgentContext(
  supabase: SupabaseClient,
  input: AgentTurnInput
): Promise<AgentContext> {
  // 1. Get or create tenant
  let { data: tenantRow } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", input.tenantId)
    .single();

  if (!tenantRow) {
    // Auto-create tenant for demo purposes
    const { data: newTenant, error } = await supabase
      .from("tenants")
      .insert({
        id: input.tenantId,
        user_id: input.peerId,
        name: `Tenant ${input.tenantId.substring(0, 8)}`,
        config: DEFAULT_CONFIG,
      })
      .select()
      .single();
    if (error) throw error;
    tenantRow = newTenant;

    // Initialize workspace files
    await initializeWorkspaceFiles(supabase, input.tenantId);
  }

  const tenant: Tenant = {
    id: tenantRow.id,
    userId: tenantRow.user_id,
    name: tenantRow.name,
    config: { ...DEFAULT_CONFIG, ...tenantRow.config },
    nextHeartbeatAt: tenantRow.next_heartbeat_at,
    createdAt: tenantRow.created_at,
  };

  // 2. Get or create session
  const sessionKey =
    input.sessionKey ??
    buildSessionKey(input.tenantId, input.platform, input.chatType, input.peerId);

  let { data: sessionRow } = await supabase
    .from("sessions")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("session_key", sessionKey)
    .single();

  if (!sessionRow) {
    const { data: newSession, error } = await supabase
      .from("sessions")
      .insert({
        tenant_id: input.tenantId,
        session_key: sessionKey,
        channel: input.platform,
        chat_type: input.chatType,
        total_tokens: 0,
        input_tokens: 0,
        output_tokens: 0,
        compaction_count: 0,
        metadata: {},
      })
      .select()
      .single();
    if (error) throw error;
    sessionRow = newSession;
  }

  const session: Session = {
    id: sessionRow.id,
    tenantId: sessionRow.tenant_id,
    sessionKey: sessionRow.session_key,
    channel: sessionRow.channel,
    chatType: sessionRow.chat_type,
    totalTokens: sessionRow.total_tokens,
    inputTokens: sessionRow.input_tokens,
    outputTokens: sessionRow.output_tokens,
    compactionCount: sessionRow.compaction_count,
    metadata: sessionRow.metadata ?? {},
    createdAt: sessionRow.created_at,
    updatedAt: sessionRow.updated_at,
  };

  // 3. Parallel pre-fetch
  const [workspaceFiles, memories, sessionSummaries, activeMission, goals, compactionSummary, messagesResult] =
    await Promise.all([
      loadWorkspaceFiles(supabase, input.tenantId),
      embedAndRecall(supabase, input.tenantId, input.userMessage),
      getSessionSummaries(supabase, input.tenantId, session.id),
      getActiveMission(supabase, input.tenantId),
      getGoals(supabase, input.tenantId),
      getLatestCompactionSummary(supabase, session.id),
      supabase
        .from("messages")
        .select("*")
        .eq("session_id", session.id)
        .is("compacted_at", null)
        .order("created_at", { ascending: true })
        .limit(100),
    ]);

  const messages = (messagesResult.data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    role: row.role as "system" | "user" | "assistant" | "tool",
    content: row.content as string,
    toolCalls: row.tool_calls as undefined,
    toolResults: row.tool_results as undefined,
    tokenCount: (row.token_count as number) ?? 0,
    compactedAt: (row.compacted_at as string) ?? null,
    createdAt: row.created_at as string,
  }));

  return {
    tenant,
    session,
    messages,
    workspaceFiles,
    memories,
    activeMission,
    goals,
    sessionSummaries,
    compactionSummary,
  };
}

async function embedAndRecall(
  supabase: SupabaseClient,
  tenantId: string,
  userMessage: string
) {
  try {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: userMessage,
    });
    return recallMemories(supabase, tenantId, embedding, 5);
  } catch {
    // If embedding fails (e.g., no API key), return empty
    return [];
  }
}
