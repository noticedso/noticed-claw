import type { ToolDefinition, AgentContext } from "../types";
import { createServerClient } from "@/supabase/client";
import { fsLs, fsRead, fsGrep } from "../virtual-fs";

export const fsLsTool: ToolDefinition = {
  name: "fs_ls",
  description:
    "list virtual filesystem directory with summaries. paths: /me, /developers, /connections, /repos. use fs_read to get full details on a specific developer.",
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
    const path = (args.path as string) ?? "/";
    return fsLs(supabase, ctx.tenant.id, path);
  },
};

export const fsReadTool: ToolDefinition = {
  name: "fs_read",
  description:
    "read full details of a developer profile or file. e.g. /developers/alexchen0.md returns name, bio, skills, repos, activity. also: /me/profile.md",
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
    const path = (args.path as string) ?? "/";
    return fsRead(supabase, ctx.tenant.id, path);
  },
};

export const fsGrepTool: ToolDefinition = {
  name: "fs_grep",
  description:
    "search all developer profiles by keyword. matches against name, bio, and skills. e.g. 'Rust' finds everyone with Rust skills. returns matching profiles with context.",
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
    const pattern = (args.pattern as string) ?? "";
    return fsGrep(supabase, ctx.tenant.id, pattern);
  },
};

export const fsTools: ToolDefinition[] = [fsLsTool, fsReadTool, fsGrepTool];
