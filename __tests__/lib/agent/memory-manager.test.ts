import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  SUPERSEDE_THRESHOLD,
  shouldSupersede,
} from "@/lib/agent/memory-manager";

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);
  });

  it("returns -1.0 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [-1, 0, 0])).toBeCloseTo(-1.0);
  });

  it("handles non-unit vectors", () => {
    expect(cosineSimilarity([2, 0], [3, 0])).toBeCloseTo(1.0);
  });

  it("handles high-dimensional vectors", () => {
    const a = Array.from({ length: 1536 }, (_, i) => Math.sin(i));
    const b = Array.from({ length: 1536 }, (_, i) => Math.sin(i));
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 0, 0])).toBe(0);
  });
});

describe("shouldSupersede", () => {
  it("returns true when similarity exceeds threshold", () => {
    expect(shouldSupersede(0.93)).toBe(true);
  });

  it("returns false when similarity is below threshold", () => {
    expect(shouldSupersede(0.91)).toBe(false);
  });

  it("returns false at exact threshold (> not >=)", () => {
    expect(shouldSupersede(0.92)).toBe(false);
  });

  it("returns true at 0.921", () => {
    expect(shouldSupersede(0.921)).toBe(true);
  });

  it("exports SUPERSEDE_THRESHOLD as 0.92", () => {
    expect(SUPERSEDE_THRESHOLD).toBe(0.92);
  });
});
