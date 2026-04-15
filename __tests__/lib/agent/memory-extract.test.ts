import { describe, it, expect } from "vitest";
import { shouldExtractMemories } from "@/lib/agent/memory-extract";

describe("shouldExtractMemories", () => {
  it("returns true for normal conversation", () => {
    expect(
      shouldExtractMemories({
        userMessage: "my name is simão and i work on distributed systems",
        assistantMessage: "nice to meet you, simão. i've updated your profile.",
      })
    ).toBe(true);
  });

  it("returns false when assistant response is NO_REPLY", () => {
    expect(
      shouldExtractMemories({
        userMessage: "hello",
        assistantMessage: "NO_REPLY",
      })
    ).toBe(false);
  });

  it("returns false when assistant response is HEARTBEAT_OK", () => {
    expect(
      shouldExtractMemories({
        userMessage: "heartbeat check",
        assistantMessage: "HEARTBEAT_OK",
      })
    ).toBe(false);
  });

  it("returns false for heartbeat channel", () => {
    expect(
      shouldExtractMemories({
        userMessage: "check in",
        assistantMessage: "nothing to report",
        channel: "heartbeat",
      })
    ).toBe(false);
  });

  it("returns false for cron channel", () => {
    expect(
      shouldExtractMemories({
        userMessage: "run task",
        assistantMessage: "done",
        channel: "cron",
      })
    ).toBe(false);
  });

  it("returns false for very short exchanges (small talk)", () => {
    expect(
      shouldExtractMemories({
        userMessage: "hi",
        assistantMessage: "hey",
      })
    ).toBe(false);
  });

  it("returns true when user message is short but assistant response is long", () => {
    expect(
      shouldExtractMemories({
        userMessage: "hi",
        assistantMessage: "welcome! i see you're new here. let me help you get set up with your profile and workspace.",
      })
    ).toBe(true);
  });
});
