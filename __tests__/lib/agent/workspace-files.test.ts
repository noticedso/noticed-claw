// __tests__/lib/agent/workspace-files.test.ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_WORKSPACE_FILES,
  WORKSPACE_FILE_NAMES,
} from "@/lib/agent/workspace-files";

describe("workspace-files", () => {
  it("DEFAULT_WORKSPACE_FILES has exactly 7 keys", () => {
    expect(Object.keys(DEFAULT_WORKSPACE_FILES)).toHaveLength(7);
  });

  it("WORKSPACE_FILE_NAMES includes all 7 expected file names", () => {
    const expected = [
      "AGENTS.md",
      "SOUL.md",
      "USER.md",
      "IDENTITY.md",
      "BOOTSTRAP.md",
      "HEARTBEAT.md",
      "TOOLS.md",
    ];
    for (const name of expected) {
      expect(WORKSPACE_FILE_NAMES).toContain(name);
    }
    expect(WORKSPACE_FILE_NAMES).toHaveLength(7);
  });

  it("each default file has non-empty content", () => {
    for (const [name, content] of Object.entries(DEFAULT_WORKSPACE_FILES)) {
      expect(typeof content).toBe("string");
      expect(content.length).toBeGreaterThan(0);
      expect(content.trim().length).toBeGreaterThan(0);
    }
  });

  it("AGENTS.md contains rules section", () => {
    expect(DEFAULT_WORKSPACE_FILES["AGENTS.md"]).toContain("## rules");
  });

  it("IDENTITY.md contains agent name", () => {
    expect(DEFAULT_WORKSPACE_FILES["IDENTITY.md"]).toContain("claw");
  });

  it("BOOTSTRAP.md references onboarding", () => {
    expect(DEFAULT_WORKSPACE_FILES["BOOTSTRAP.md"]).toContain("onboarding");
  });
});
