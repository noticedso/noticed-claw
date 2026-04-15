import { describe, it, expect } from "vitest";
import { isSilentReply, SILENT_TOKENS } from "@/lib/agent/stream-bridge";

describe("isSilentReply", () => {
  it("returns true for NO_REPLY", () => {
    expect(isSilentReply("NO_REPLY")).toBe(true);
  });

  it("returns true for HEARTBEAT_OK", () => {
    expect(isSilentReply("HEARTBEAT_OK")).toBe(true);
  });

  it("returns false for regular text", () => {
    expect(isSilentReply("Hello there")).toBe(false);
  });

  it("returns true for trimmed NO_REPLY", () => {
    expect(isSilentReply("  NO_REPLY  ")).toBe(true);
  });

  it("returns false for NO_REPLY followed by more text", () => {
    // First 20 chars of "NO_REPLY and more text" = "NO_REPLY and more te" != "NO_REPLY"
    expect(isSilentReply("NO_REPLY and more text")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSilentReply("")).toBe(false);
  });

  it("exports SILENT_TOKENS", () => {
    expect(SILENT_TOKENS).toContain("NO_REPLY");
    expect(SILENT_TOKENS).toContain("HEARTBEAT_OK");
  });
});
