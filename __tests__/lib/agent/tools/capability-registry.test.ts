import { describe, it, expect } from "vitest";
import {
  scoreCapability,
  searchCapabilities,
  CAPABILITIES,
} from "@/lib/agent/tools/capability-registry";

describe("scoreCapability", () => {
  const memoryCap = {
    name: "memory_search",
    description: "search memories by semantic similarity",
    category: "memory",
    parameters: {},
  };

  it("returns 3 for exact name match", () => {
    expect(scoreCapability(memoryCap, "memory_search")).toBe(3);
  });

  it("returns 2 for prefix match", () => {
    expect(scoreCapability(memoryCap, "memory")).toBe(2);
  });

  it("returns token match count for description", () => {
    const score = scoreCapability(memoryCap, "search memories");
    expect(score).toBeGreaterThan(0);
  });

  it("returns 0 for completely unrelated query", () => {
    expect(scoreCapability(memoryCap, "xyz123")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(scoreCapability(memoryCap, "MEMORY_SEARCH")).toBe(3);
  });
});

describe("searchCapabilities", () => {
  it("finds memory-related capabilities", () => {
    const results = searchCapabilities(CAPABILITIES, "memory", 3);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain("memory");
  });

  it("returns empty for unrelated query", () => {
    const results = searchCapabilities(CAPABILITIES, "xyznonexistent", 3);
    expect(results).toHaveLength(0);
  });

  it("respects limit", () => {
    const results = searchCapabilities(CAPABILITIES, "search", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("sorts by score descending", () => {
    const results = searchCapabilities(CAPABILITIES, "memory search", 5);
    if (results.length >= 2) {
      const s1 = scoreCapability(results[0], "memory search");
      const s2 = scoreCapability(results[1], "memory search");
      expect(s1).toBeGreaterThanOrEqual(s2);
    }
  });
});

describe("CAPABILITIES", () => {
  it("has 11 capabilities", () => {
    expect(CAPABILITIES).toHaveLength(11);
  });

  it("includes expected tool names", () => {
    const names = CAPABILITIES.map((c) => c.name);
    expect(names).toContain("memory_search");
    expect(names).toContain("fs_ls");
    expect(names).toContain("web_search");
    expect(names).toContain("cron");
    expect(names).toContain("workspace_write");
  });
});
