import { describe, it, expect } from "vitest";
import { buildDedupeKey } from "@/lib/agent/thread-queue";

describe("buildDedupeKey", () => {
  it("returns correct format", () => {
    expect(buildDedupeKey("thread_1", "msg_1")).toBe("thread_1:msg_1");
  });

  it("handles empty thread ID", () => {
    expect(buildDedupeKey("", "msg_1")).toBe(":msg_1");
  });

  it("handles special characters", () => {
    expect(buildDedupeKey("thread:a", "msg:b")).toBe("thread:a:msg:b");
  });
});
