import { describe, it, expect } from "vitest";
import {
  MISSION_CATALOG,
  MISSION_ORDER,
  getNextMissionType,
  getMissionTemplate,
} from "@/lib/agent/mission-engine";

describe("MISSION_CATALOG", () => {
  it("has 3 mission templates", () => {
    expect(MISSION_CATALOG).toHaveLength(3);
  });

  it("has onboarding, audience_building, outreach types", () => {
    const types = MISSION_CATALOG.map((m) => m.type);
    expect(types).toContain("onboarding");
    expect(types).toContain("audience_building");
    expect(types).toContain("outreach");
  });

  it("each template has title, objective, and non-empty checkpoints", () => {
    for (const template of MISSION_CATALOG) {
      expect(template.title).toBeTruthy();
      expect(template.objective).toBeTruthy();
      expect(template.checkpoints.length).toBeGreaterThan(0);
      for (const cp of template.checkpoints) {
        expect(cp.key).toBeTruthy();
        expect(cp.description).toBeTruthy();
      }
    }
  });
});

describe("MISSION_ORDER", () => {
  it("has correct order", () => {
    expect(MISSION_ORDER).toEqual(["onboarding", "audience_building", "outreach"]);
  });
});

describe("getNextMissionType", () => {
  it("returns onboarding when current is null", () => {
    expect(getNextMissionType(null)).toBe("onboarding");
  });

  it("returns audience_building after onboarding", () => {
    expect(getNextMissionType("onboarding")).toBe("audience_building");
  });

  it("returns outreach after audience_building", () => {
    expect(getNextMissionType("audience_building")).toBe("outreach");
  });

  it("returns null after outreach (last mission)", () => {
    expect(getNextMissionType("outreach")).toBeNull();
  });
});

describe("getMissionTemplate", () => {
  it("returns correct template for onboarding", () => {
    const template = getMissionTemplate("onboarding");
    expect(template.type).toBe("onboarding");
    expect(template.title).toBe("get set up");
  });

  it("returns correct template for audience_building", () => {
    const template = getMissionTemplate("audience_building");
    expect(template.type).toBe("audience_building");
  });

  it("throws for unknown type", () => {
    expect(() => getMissionTemplate("invalid" as never)).toThrow();
  });
});
