import type { ToolDefinition } from "../types";
import { webSearchTool } from "./web-search";
import { webFetchTool } from "./web-fetch";
import { memoryTools } from "./memory-tools";
import { workspaceWriteTool } from "./workspace-write";
import { cronTool } from "./cron-tool";
import { fsTools } from "./fs-tools";
import { missionTool } from "./mission-tool";

export function getAllBuiltinTools(): ToolDefinition[] {
  return [
    webSearchTool,
    webFetchTool,
    ...memoryTools,
    workspaceWriteTool,
    cronTool,
    missionTool,
    ...fsTools,
  ];
}

export {
  webSearchTool,
  webFetchTool,
  memoryTools,
  workspaceWriteTool,
  cronTool,
  missionTool,
  fsTools,
};
