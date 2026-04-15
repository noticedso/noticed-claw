import { describe, it, expect, vi } from "vitest";

// Mock all external dependencies
vi.mock("@/supabase/client", () => ({
  createServerClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "msg-1" }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "q-1" }, error: null }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
  }),
}));

vi.mock("ai", () => ({
  embed: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2] }),
  generateText: vi.fn().mockResolvedValue({
    text: "agent response",
    steps: [],
    usage: { promptTokens: 100, completionTokens: 50 },
  }),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: Object.assign(vi.fn().mockReturnValue("mock-model"), {
    embedding: vi.fn().mockReturnValue("mock-embed"),
  }),
}));

vi.mock("@/lib/agent/agent-router", () => ({
  resolveAgentContext: vi.fn().mockResolvedValue({
    tenant: {
      id: "t1",
      userId: "u1",
      name: "Test",
      config: {
        model: "gpt-4o-mini",
        persona: "donna",
        heartbeatEnabled: false,
        heartbeatIntervalMs: 3600000,
        activeHoursStart: 9,
        activeHoursEnd: 21,
        timezone: "UTC",
        toolPolicy: {},
      },
      nextHeartbeatAt: null,
      createdAt: new Date().toISOString(),
    },
    session: {
      id: "s1",
      tenantId: "t1",
      sessionKey: "k",
      channel: "webchat",
      chatType: "dm",
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      compactionCount: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    messages: [],
    workspaceFiles: [],
    memories: [],
    activeMission: null,
    goals: [],
    sessionSummaries: [],
    compactionSummary: null,
  }),
}));

vi.mock("@/lib/agent/thread-queue", () => ({
  enqueueMessage: vi.fn().mockResolvedValue(true),
  acquireThreadLock: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/agent/memory-manager", () => ({
  extractAndStoreMemories: vi.fn().mockResolvedValue(undefined),
  recallMemories: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/agent/session-awareness", () => ({
  upsertSessionSummary: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/agent/compaction", () => ({
  shouldCompact: vi.fn().mockReturnValue(false),
  compactSession: vi.fn(),
}));

import { runAgentTurn } from "@/lib/agent/agent-turn";
import { generateText } from "ai";

describe("runAgentTurn", () => {
  it("returns AgentTurnResult shape", async () => {
    const result = await runAgentTurn({
      tenantId: "t1",
      sessionKey: "tenant:t1:webchat:dm:u1",
      userMessage: "hello",
      platform: "webchat",
      chatType: "dm",
      peerId: "u1",
    });

    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("silent");
    expect(result).toHaveProperty("sessionId");
    expect(result).toHaveProperty("tokens");
    expect(result.tokens).toHaveProperty("input");
    expect(result.tokens).toHaveProperty("output");
    expect(result.tokens).toHaveProperty("total");
  });

  it("returns content from non-silent reply", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "hello from noticed-claw",
      steps: [],
      usage: { promptTokens: 100, completionTokens: 50 },
    } as never);

    const result = await runAgentTurn({
      tenantId: "t1",
      sessionKey: "k",
      userMessage: "hello",
      platform: "webchat",
      chatType: "dm",
      peerId: "u1",
    });

    expect(result.content).toBe("hello from noticed-claw");
    expect(result.silent).toBe(false);
  });

  it("returns silent result for NO_REPLY", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "NO_REPLY",
      steps: [],
      usage: { promptTokens: 50, completionTokens: 10 },
    } as never);

    const result = await runAgentTurn({
      tenantId: "t1",
      sessionKey: "k",
      userMessage: "hello",
      platform: "webchat",
      chatType: "dm",
      peerId: "u1",
    });

    expect(result.content).toBeNull();
    expect(result.silent).toBe(true);
  });

  it("returns token counts", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "response",
      steps: [],
      usage: { promptTokens: 200, completionTokens: 100 },
    } as never);

    const result = await runAgentTurn({
      tenantId: "t1",
      sessionKey: "k",
      userMessage: "hello",
      platform: "webchat",
      chatType: "dm",
      peerId: "u1",
    });

    expect(result.tokens.input).toBe(200);
    expect(result.tokens.output).toBe(100);
    expect(result.tokens.total).toBe(300);
  });
});
