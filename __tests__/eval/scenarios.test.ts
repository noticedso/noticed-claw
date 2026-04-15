import { describe, it, expect } from "vitest";
import { loadScenarios } from "@/eval/scenarios";

describe("loadScenarios", () => {
  it("returns an array of scenarios", () => {
    const scenarios = loadScenarios();
    expect(Array.isArray(scenarios)).toBe(true);
    expect(scenarios.length).toBeGreaterThan(0);
  });

  it("each scenario has key, description, messages, expected", () => {
    const scenarios = loadScenarios();
    for (const s of scenarios) {
      expect(s.key).toBeTruthy();
      expect(typeof s.description).toBe("string");
      expect(Array.isArray(s.messages)).toBe(true);
      expect(s.messages.length).toBeGreaterThan(0);
      expect(typeof s.expected).toBe("object");
    }
  });

  it("returns exactly 6 scenarios", () => {
    const scenarios = loadScenarios();
    expect(scenarios).toHaveLength(10);
  });

  it("scenarios are sorted by filename", () => {
    const scenarios = loadScenarios();
    const keys = scenarios.map((s) => s.key);
    expect(keys[0]).toBe("onboarding_persona_selection");
    expect(keys[5]).toBe("cron_job_creation");
  });
});
