import type { ToolDefinition, AgentContext } from "../types";
import { createServerClient } from "@/supabase/client";
import { recallMemories } from "../memory-manager";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export const memorySearchTool: ToolDefinition = {
  name: "memory_search",
  description: "search memories by semantic similarity",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "search query" },
      count: { type: "number", description: "max results (default 5)" },
    },
    required: ["query"],
  },
  execute: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const query = args.query as string;
    const count = (args.count as number) ?? 5;

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    const supabase = createServerClient();
    return recallMemories(supabase, ctx.tenant.id, embedding, count);
  },
};

export const memoryGetTool: ToolDefinition = {
  name: "memory_get",
  description: "get a specific memory by ID",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "memory ID" },
    },
    required: ["id"],
  },
  execute: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const id = args.id as string;
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", ctx.tenant.id)
      .single();

    if (error) throw error;
    return data;
  },
};

export const memoryTools: ToolDefinition[] = [memorySearchTool, memoryGetTool];
