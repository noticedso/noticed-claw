// __tests__/lib/agent/types.test.ts
import { describe, it, expect } from "vitest";
import type {
  PersonaKey,
  ToolProfile,
  MessageRole,
  MemoryCategory,
  MemoryStatus,
  MemoryType,
  MissionKind,
  MissionType,
  MissionStatus,
  ScheduleKind,
  SessionTarget,
  ToolPolicy,
  TenantConfig,
  Tenant,
  Session,
  ToolCall,
  ToolResult,
  Message,
  Memory,
  MemoryRecall,
  CompactionSummary,
  Checkpoint,
  Mission,
  WorkspaceFile,
  CronJob,
  SessionSummary,
  SessionSummaryWithSession,
  AgentContext,
  AgentTurnInput,
  AgentTurnResult,
  ToolDefinition,
  Capability,
  DeveloperProfile,
} from "@/lib/agent/types";

describe("Core types", () => {
  it("PersonaKey accepts valid values", () => {
    const keys: PersonaKey[] = ["ari", "donna", "ted"];
    expect(keys).toHaveLength(3);
  });

  it("ToolProfile accepts valid values", () => {
    const profiles: ToolProfile[] = ["minimal", "standard", "full"];
    expect(profiles).toHaveLength(3);
  });

  it("MessageRole accepts valid values", () => {
    const roles: MessageRole[] = ["system", "user", "assistant", "tool"];
    expect(roles).toHaveLength(4);
  });

  it("MemoryCategory accepts valid values", () => {
    const cats: MemoryCategory[] = ["preference", "decision", "fact", "commitment", "milestone"];
    expect(cats).toHaveLength(5);
  });

  it("TenantConfig is constructable", () => {
    const config: TenantConfig = {
      model: "gpt-4o",
      persona: "donna",
      heartbeatEnabled: false,
      heartbeatIntervalMs: 3600000,
      activeHoursStart: 9,
      activeHoursEnd: 22,
      timezone: "UTC",
      toolPolicy: {},
    };
    expect(config.model).toBe("gpt-4o");
    expect(config.persona).toBe("donna");
  });

  it("Tenant is constructable", () => {
    const tenant: Tenant = {
      id: "t1",
      userId: "u1",
      name: "Test",
      config: {
        model: "gpt-4o",
        persona: "donna",
        heartbeatEnabled: false,
        heartbeatIntervalMs: 3600000,
        activeHoursStart: 9,
        activeHoursEnd: 22,
        timezone: "UTC",
        toolPolicy: {},
      },
      nextHeartbeatAt: null,
      createdAt: new Date().toISOString(),
    };
    expect(tenant.id).toBe("t1");
  });

  it("Message is constructable with tool calls", () => {
    const msg: Message = {
      id: "m1",
      sessionId: "s1",
      role: "assistant",
      content: "hello",
      toolCalls: [{ id: "tc1", name: "web_search", args: { query: "test" } }],
      toolResults: [{ toolCallId: "tc1", toolName: "web_search", result: { data: [] } }],
      tokenCount: 100,
      compactedAt: null,
      createdAt: new Date().toISOString(),
    };
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolResults).toHaveLength(1);
  });

  it("AgentTurnInput is constructable", () => {
    const input: AgentTurnInput = {
      tenantId: "t1",
      sessionKey: "key",
      userMessage: "hello",
      platform: "webchat",
      chatType: "dm",
      peerId: "p1",
    };
    expect(input.tenantId).toBe("t1");
  });

  it("AgentTurnResult is constructable", () => {
    const result: AgentTurnResult = {
      content: "response",
      silent: false,
      sessionId: "s1",
      tokens: { input: 50, output: 100, total: 150 },
    };
    expect(result.tokens.total).toBe(150);
  });

  it("DeveloperProfile is constructable", () => {
    const profile: DeveloperProfile = {
      id: "dp1",
      login: "devuser",
      name: "Dev User",
      bio: "A developer",
      skills: ["TypeScript", "React"],
      repos: [{ name: "my-app", description: "An app", language: "TypeScript", stars: 42 }],
      connections: ["dp2"],
      activity: { commitCount: 500, languages: ["TypeScript"], recentRepos: ["my-app"] },
      createdAt: new Date().toISOString(),
    };
    expect(profile.skills).toHaveLength(2);
    expect(profile.repos[0].stars).toBe(42);
  });

  it("Mission with checkpoints is constructable", () => {
    const mission: Mission = {
      id: "mi1",
      tenantId: "t1",
      kind: "mission",
      missionType: "onboarding",
      status: "active",
      title: "Get started",
      objective: "Complete onboarding",
      checkpoints: [
        { key: "persona", description: "Pick a persona", completed: false },
        { key: "first_msg", description: "Send first message", completed: true, completedAt: new Date().toISOString() },
      ],
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(mission.checkpoints).toHaveLength(2);
    expect(mission.checkpoints[1].completed).toBe(true);
  });
});
