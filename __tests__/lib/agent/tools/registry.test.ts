import { describe, it, expect } from "vitest";
import { resolveTools } from "@/lib/agent/tools/registry";
import type { ToolDefinition, AgentContext } from "@/lib/agent/types";

const noop = async () => ({});

const mockTools: ToolDefinition[] = [
  { name: "basic_tool", description: "basic", profile: "minimal", parameters: {}, execute: noop },
  { name: "web_search", description: "search", profile: "standard", parameters: {}, execute: noop },
  { name: "memory_search", description: "memory", profile: "standard", parameters: {}, execute: noop },
  { name: "admin_tool", description: "admin", profile: "full", parameters: {}, execute: noop },
];

describe("resolveTools", () => {
  it("returns only minimal-profile tools for minimal", () => {
    const result = resolveTools(mockTools, "minimal");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("basic_tool");
  });

  it("returns minimal + standard tools for standard", () => {
    const result = resolveTools(mockTools, "standard");
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.name)).toContain("basic_tool");
    expect(result.map((t) => t.name)).toContain("web_search");
    expect(result.map((t) => t.name)).toContain("memory_search");
  });

  it("returns all tools for full", () => {
    const result = resolveTools(mockTools, "full");
    expect(result).toHaveLength(4);
  });

  it("respects deny list", () => {
    const result = resolveTools(mockTools, "standard", { deny: ["web_search"] });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.name)).not.toContain("web_search");
  });

  it("respects allow list", () => {
    const result = resolveTools(mockTools, "standard", { allow: ["memory_search"] });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("memory_search");
  });

  it("deny overrides allow", () => {
    const result = resolveTools(mockTools, "standard", {
      allow: ["memory_search"],
      deny: ["memory_search"],
    });
    expect(result).toHaveLength(0);
  });
});
