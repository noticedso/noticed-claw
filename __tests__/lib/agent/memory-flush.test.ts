import { describe, it, expect } from "vitest";
import { shouldRunMemoryFlush, MEMORY_FLUSH_SOFT_TOKENS } from "@/lib/agent/memory-flush";

describe("MEMORY_FLUSH_SOFT_TOKENS", () => {
  it("equals 40000", () => {
    expect(MEMORY_FLUSH_SOFT_TOKENS).toBe(40000);
  });
});

describe("shouldRunMemoryFlush", () => {
  it("returns true when tokens exceed soft threshold", () => {
    expect(shouldRunMemoryFlush(41000)).toBe(true);
  });

  it("returns false when tokens are below soft threshold", () => {
    expect(shouldRunMemoryFlush(30000)).toBe(false);
  });

  it("returns true at exact threshold", () => {
    expect(shouldRunMemoryFlush(40000)).toBe(true);
  });

  it("returns true with custom threshold", () => {
    expect(shouldRunMemoryFlush(15000, 10000)).toBe(true);
  });

  it("returns false with custom threshold when below", () => {
    expect(shouldRunMemoryFlush(5000, 10000)).toBe(false);
  });
});
