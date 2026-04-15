import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/agent/prompt-builder";
import type { AgentContext } from "@/lib/agent/types";

const mockContext: AgentContext = {
  tenant: {
    id: "t1",
    userId: "u1",
    name: "Test Tenant",
    config: {
      model: "gpt-4o-mini",
      persona: "ari",
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
    sessionKey: "tenant:t1:webchat:dm:u1",
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
  workspaceFiles: [
    {
      id: "wf1",
      tenantId: "t1",
      fileName: "IDENTITY.md",
      content: "# identity\nname: test agent",
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    },
  ],
  memories: [
    {
      id: "m1",
      content: "user prefers concise responses",
      category: "preference",
      memoryType: "curated",
      similarity: 0.85,
    },
  ],
  activeMission: null,
  goals: [],
  sessionSummaries: [],
  compactionSummary: null,
};

describe("buildSystemPrompt", () => {
  it("returns empty string for 'none' mode", () => {
    expect(buildSystemPrompt(mockContext, "none")).toBe("");
  });

  it("contains brand voice section in minimal mode", () => {
    const prompt = buildSystemPrompt(mockContext, "minimal");
    expect(prompt).toContain("brand voice");
    expect(prompt).toContain("lowercase always");
  });

  it("contains persona name in prompt", () => {
    const prompt = buildSystemPrompt(mockContext, "minimal");
    expect(prompt).toContain("ari");
  });

  it("brand voice appears before persona", () => {
    const prompt = buildSystemPrompt(mockContext, "full");
    const brandIdx = prompt.indexOf("brand voice");
    const personaIdx = prompt.indexOf("persona: ari");
    expect(brandIdx).toBeLessThan(personaIdx);
  });

  it("minimal is shorter than full", () => {
    const minimal = buildSystemPrompt(mockContext, "minimal");
    const full = buildSystemPrompt(mockContext, "full");
    expect(minimal.length).toBeLessThan(full.length);
  });

  it("includes memory recall section in full mode", () => {
    const prompt = buildSystemPrompt(mockContext, "full");
    expect(prompt).toContain("relevant memories");
    expect(prompt).toContain("user prefers concise responses");
  });

  it("includes workspace files in full mode", () => {
    const prompt = buildSystemPrompt(mockContext, "full");
    expect(prompt).toContain("IDENTITY.md");
  });

  it("includes identity section", () => {
    const prompt = buildSystemPrompt(mockContext, "full");
    expect(prompt).toContain("you are claw");
  });

  it("includes runtime info in full mode", () => {
    const prompt = buildSystemPrompt(mockContext, "full");
    expect(prompt).toContain("runtime");
    expect(prompt).toContain("Test Tenant");
  });
});
