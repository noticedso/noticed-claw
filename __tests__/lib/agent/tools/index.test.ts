import { describe, it, expect } from "vitest";
import { getAllBuiltinTools } from "@/lib/agent/tools";

describe("getAllBuiltinTools", () => {
  it("returns 9 tools total", () => {
    const tools = getAllBuiltinTools();
    expect(tools).toHaveLength(9);
  });

  it("each tool has name, description, profile, parameters, execute", () => {
    const tools = getAllBuiltinTools();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.profile).toBeTruthy();
      expect(tool.parameters).toBeDefined();
      expect(typeof tool.execute).toBe("function");
    }
  });

  it("includes expected tool names", () => {
    const names = getAllBuiltinTools().map((t) => t.name);
    expect(names).toContain("web_search");
    expect(names).toContain("web_fetch");
    expect(names).toContain("memory_search");
    expect(names).toContain("memory_get");
    expect(names).toContain("workspace_write");
    expect(names).toContain("cron");
    expect(names).toContain("fs_ls");
    expect(names).toContain("fs_read");
    expect(names).toContain("fs_grep");
  });
});
