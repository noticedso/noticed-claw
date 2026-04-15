import { describe, it, expect } from "vitest";
import { calculateNextRun, isDue } from "@/lib/agent/cron";

describe("calculateNextRun", () => {
  it("returns exact date for 'at' schedule", () => {
    const iso = "2026-01-01T00:00:00Z";
    const result = calculateNextRun("at", iso, "UTC");
    expect(result.getTime()).toBe(new Date(iso).getTime());
  });

  it("returns ~1h from now for 'every' 3600000ms", () => {
    const before = Date.now();
    const result = calculateNextRun("every", "3600000", "UTC");
    const after = Date.now();
    const expected = before + 3600000;
    expect(result.getTime()).toBeGreaterThanOrEqual(expected - 100);
    expect(result.getTime()).toBeLessThanOrEqual(after + 3600000 + 100);
  });

  it("returns a future date for 'cron' expression", () => {
    const result = calculateNextRun("cron", "0 9 * * MON", "UTC");
    expect(result.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("isDue", () => {
  it("returns true for past date", () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(isDue(past)).toBe(true);
  });

  it("returns false for future date", () => {
    const future = new Date(Date.now() + 60000).toISOString();
    expect(isDue(future)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDue(null)).toBe(false);
  });
});
