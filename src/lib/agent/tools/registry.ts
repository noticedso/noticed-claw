import type { ToolDefinition, ToolProfile, ToolPolicy } from "../types";

const PROFILE_LEVELS: Record<ToolProfile, number> = {
  minimal: 0,
  standard: 1,
  full: 2,
};

export function resolveTools(
  allTools: ToolDefinition[],
  profile: ToolProfile,
  policy?: ToolPolicy
): ToolDefinition[] {
  const level = PROFILE_LEVELS[profile];
  let tools = allTools.filter((t) => PROFILE_LEVELS[t.profile] <= level);

  if (policy?.allow?.length) {
    tools = tools.filter((t) => policy.allow!.includes(t.name));
  }
  if (policy?.deny?.length) {
    tools = tools.filter((t) => !policy.deny!.includes(t.name));
  }

  return tools;
}
