import type { ToolDefinition, AgentContext } from "../types";
import { CAPABILITIES, searchCapabilities } from "./capability-registry";

export function getCodeModeTools(
  executeCapability: (
    name: string,
    args: Record<string, unknown>,
    ctx: AgentContext
  ) => Promise<unknown>
): ToolDefinition[] {
  return [
    {
      name: "search",
      description:
        "search available capabilities by keyword. returns names, descriptions, and parameter schemas.",
      profile: "standard",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "search keywords" },
          category: {
            type: "string",
            description:
              "optional category filter (memory, workspace, scheduling, filesystem, web, sessions)",
          },
        },
        required: ["query"],
      },
      execute: async (args: Record<string, unknown>) => {
        let caps = CAPABILITIES;
        if (args.category) {
          caps = caps.filter((c) => c.category === args.category);
        }
        const results = searchCapabilities(caps, args.query as string, 5);
        return results.map((r) => ({
          name: r.name,
          description: r.description,
          category: r.category,
          parameters: r.parameters,
        }));
      },
    },
    {
      name: "execute",
      description: "execute a capability by exact name with arguments",
      profile: "standard",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "capability name" },
          args: { type: "object", description: "capability arguments" },
        },
        required: ["name"],
      },
      execute: async (
        args: Record<string, unknown>,
        ctx: AgentContext
      ) => {
        const capName = args.name as string;
        const capArgs = (args.args as Record<string, unknown>) ?? {};
        return executeCapability(capName, capArgs, ctx);
      },
    },
  ];
}
