import { describe, it, expect, vi } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn().mockReturnValue("mock-model"),
}));

import { generateText } from "ai";
import { judgeScenario } from "@/eval/judge";

describe("judgeScenario", () => {
  it("returns scores with all 6 dimensions", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify({
        coherence: 8,
        persona_adherence: 7,
        tool_usage: 6,
        brand_voice_compliance: 9,
        task_completion: 8,
        memory_quality: 7,
        reasoning: "good performance overall",
      }),
    } as never);

    const result = await judgeScenario(
      { key: "test", description: "test", messages: [], expected: {} },
      [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }]
    );

    expect(result.coherence).toBe(8);
    expect(result.persona_adherence).toBe(7);
    expect(result.tool_usage).toBe(6);
    expect(result.brand_voice_compliance).toBe(9);
    expect(result.task_completion).toBe(8);
    expect(result.memory_quality).toBe(7);
    expect(result.reasoning).toBe("good performance overall");
  });

  it("all scores are numbers 0-10", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify({
        coherence: 15, // exceeds 10
        persona_adherence: -2, // below 0
        tool_usage: 7,
        brand_voice_compliance: 8,
        task_completion: 9,
        memory_quality: 6,
        reasoning: "test",
      }),
    } as never);

    const result = await judgeScenario(
      { key: "test", description: "test", messages: [], expected: {} },
      []
    );

    expect(result.coherence).toBe(10); // clamped
    expect(result.persona_adherence).toBe(0); // clamped
  });

  it("handles malformed LLM response gracefully", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "not valid json",
    } as never);

    const result = await judgeScenario(
      { key: "test", description: "test", messages: [], expected: {} },
      []
    );

    // Should default to 5 for all dimensions
    expect(result.coherence).toBe(5);
    expect(result.persona_adherence).toBe(5);
    expect(result.reasoning).toContain("judge error");
  });
});
