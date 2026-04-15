import { describe, it, expect, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockReturnValue("mock-model"),
}));

import { generateText } from "ai";
import { runLLM, MAX_TOOL_ITERATIONS } from "@/lib/agent/llm-runner";
import type { AgentContext, ToolDefinition } from "@/lib/agent/types";

const mockContext: AgentContext = {
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
};

describe("MAX_TOOL_ITERATIONS", () => {
  it("equals 10", () => {
    expect(MAX_TOOL_ITERATIONS).toBe(10);
  });
});

describe("runLLM", () => {
  it("returns content from LLM response", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "hello from the agent",
      steps: [],
      usage: { promptTokens: 100, completionTokens: 50 },
    } as never);

    const result = await runLLM("system prompt", [], [], mockContext);
    expect(result.content).toBe("hello from the agent");
  });

  it("returns token usage", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "hi",
      steps: [],
      usage: { promptTokens: 200, completionTokens: 100 },
    } as never);

    const result = await runLLM("system", [], [], mockContext);
    expect(result.tokens.input).toBe(200);
    expect(result.tokens.output).toBe(100);
  });

  it("collects tool calls from steps", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "done",
      steps: [
        {
          toolCalls: [
            { toolCallId: "tc1", toolName: "web_search", args: { query: "test" } },
          ],
        },
      ],
      usage: { promptTokens: 50, completionTokens: 50 },
    } as never);

    const result = await runLLM("system", [], [], mockContext);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe("web_search");
    expect(result.toolCalls[0].args).toEqual({ query: "test" });
  });

  it("handles empty tool calls", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "no tools used",
      steps: [{ toolCalls: [] }],
      usage: { promptTokens: 50, completionTokens: 50 },
    } as never);

    const result = await runLLM("system", [], [], mockContext);
    expect(result.toolCalls).toHaveLength(0);
  });

  it("passes maxSteps equal to MAX_TOOL_ITERATIONS", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "",
      steps: [],
      usage: { promptTokens: 0, completionTokens: 0 },
    } as never);

    await runLLM("system", [], [], mockContext);

    expect(vi.mocked(generateText)).toHaveBeenCalledWith(
      expect.objectContaining({ maxSteps: MAX_TOOL_ITERATIONS })
    );
  });
});
