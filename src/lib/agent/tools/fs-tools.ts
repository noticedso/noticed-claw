import type { ToolDefinition, AgentContext } from "../types";
import { createServerClient } from "@/supabase/client";
import { fsLs, fsRead, fsGrep } from "../virtual-fs";

export const fsLsTool: ToolDefinition = {
  name: "fs_ls",
  description:
    "list virtual filesystem directory. paths: /me, /developers, /connections, /repos",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "directory path (e.g. /developers)",
      },
    },
    required: ["path"],
  },
  execute: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const supabase = createServerClient();
    return fsLs(supabase, ctx.tenant.id, args.path as string);
  },
};

export const fsReadTool: ToolDefinition = {
  name: "fs_read",
  description:
    "read a virtual filesystem file. e.g. /developers/alice.md, /me/profile.md",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "file path (e.g. /developers/alice.md)",
      },
    },
    required: ["path"],
  },
  execute: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const supabase = createServerClient();
    return fsRead(supabase, ctx.tenant.id, args.path as string);
  },
};

export const fsGrepTool: ToolDefinition = {
  name: "fs_grep",
  description:
    "search virtual filesystem by keyword pattern across developer profiles (name, bio, skills)",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "search pattern (e.g. 'Rust' or 'distributed systems')",
      },
    },
    required: ["pattern"],
  },
  execute: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const supabase = createServerClient();
    return fsGrep(supabase, ctx.tenant.id, args.pattern as string);
  },
};

export const fsTools: ToolDefinition[] = [fsLsTool, fsReadTool, fsGrepTool];
