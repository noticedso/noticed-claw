import { describe, it, expect, vi } from "vitest";

// Mock all dependencies
vi.mock("ai", () => ({
  embed: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] }),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: {
    embedding: vi.fn().mockReturnValue("mock-embedding-model"),
  },
}));

vi.mock("@/supabase/client", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/agent/workspace-files", () => ({
  loadWorkspaceFiles: vi.fn().mockResolvedValue([]),
  initializeWorkspaceFiles: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/agent/memory-manager", () => ({
  recallMemories: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/agent/session-awareness", () => ({
  getSessionSummaries: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/agent/mission-engine", () => ({
  getActiveMission: vi.fn().mockResolvedValue(null),
  getGoals: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/agent/compaction", () => ({
  getLatestCompactionSummary: vi.fn().mockResolvedValue(null),
}));

import { resolveAgentContext } from "@/lib/agent/agent-router";
import type { AgentTurnInput } from "@/lib/agent/types";

function createMockSupabase() {
  const tenantRow = {
    id: "t1",
    user_id: "u1",
    name: "Test",
    config: { model: "gpt-4o-mini", persona: "donna", heartbeatEnabled: false, heartbeatIntervalMs: 3600000, activeHoursStart: 9, activeHoursEnd: 21, timezone: "UTC", toolPolicy: {} },
    next_heartbeat_at: null,
    created_at: new Date().toISOString(),
  };

  const sessionRow = {
    id: "s1",
    tenant_id: "t1",
    session_key: "tenant:t1:webchat:dm:u1",
    channel: "webchat",
    chat_type: "dm",
    total_tokens: 100,
    input_tokens: 60,
    output_tokens: 40,
    compaction_count: 0,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "tenants") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: tenantRow, error: null }),
            }),
          }),
        };
      }
      if (table === "sessions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: sessionRow, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "messages") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  } as never;
}

describe("resolveAgentContext", () => {
  const input: AgentTurnInput = {
    tenantId: "t1",
    sessionKey: "tenant:t1:webchat:dm:u1",
    userMessage: "hello",
    platform: "webchat",
    chatType: "dm",
    peerId: "u1",
  };

  it("returns a complete AgentContext shape", async () => {
    const supabase = createMockSupabase();
    const ctx = await resolveAgentContext(supabase, input);

    expect(ctx).toHaveProperty("tenant");
    expect(ctx).toHaveProperty("session");
    expect(ctx).toHaveProperty("messages");
    expect(ctx).toHaveProperty("workspaceFiles");
    expect(ctx).toHaveProperty("memories");
    expect(ctx).toHaveProperty("activeMission");
    expect(ctx).toHaveProperty("goals");
    expect(ctx).toHaveProperty("sessionSummaries");
    expect(ctx).toHaveProperty("compactionSummary");
  });

  it("resolves tenant from input", async () => {
    const supabase = createMockSupabase();
    const ctx = await resolveAgentContext(supabase, input);

    expect(ctx.tenant.id).toBe("t1");
    expect(ctx.tenant.name).toBe("Test");
  });

  it("resolves session from input", async () => {
    const supabase = createMockSupabase();
    const ctx = await resolveAgentContext(supabase, input);

    expect(ctx.session.id).toBe("s1");
    expect(ctx.session.sessionKey).toBe("tenant:t1:webchat:dm:u1");
  });
});
