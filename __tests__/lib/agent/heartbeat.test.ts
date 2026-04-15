import { describe, it, expect } from "vitest";
import { isWithinActiveHours } from "@/lib/agent/heartbeat";

describe("isWithinActiveHours", () => {
  it("returns true during active hours", () => {
    const now = new Date("2026-04-15T14:00:00Z");
    expect(isWithinActiveHours(now, 9, 21, "UTC")).toBe(true);
  });

  it("returns false outside active hours", () => {
    const now = new Date("2026-04-15T03:00:00Z");
    expect(isWithinActiveHours(now, 9, 21, "UTC")).toBe(false);
  });

  it("returns true at start hour (inclusive)", () => {
    const now = new Date("2026-04-15T09:00:00Z");
    expect(isWithinActiveHours(now, 9, 21, "UTC")).toBe(true);
  });

  it("returns false at end hour (exclusive)", () => {
    const now = new Date("2026-04-15T21:00:00Z");
    expect(isWithinActiveHours(now, 9, 21, "UTC")).toBe(false);
  });

  it("handles timezone conversion", () => {
    // 3 AM UTC = 11 PM EST (previous day) — outside 9-21
    const now = new Date("2026-04-15T03:00:00Z");
    expect(isWithinActiveHours(now, 9, 21, "America/New_York")).toBe(false);
  });
});
