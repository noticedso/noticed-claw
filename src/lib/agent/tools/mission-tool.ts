import type { ToolDefinition, AgentContext } from "../types";
import { createServerClient } from "@/supabase/client";
import { createGoal, getActiveMission, getGoals, completeCheckpoint } from "../mission-engine";

export const missionTool: ToolDefinition = {
  name: "mission",
  description:
    "manage goals and missions. actions: set_goal (create a new goal with optional checkpoints), list (show active missions and goals), complete_checkpoint (mark a checkpoint done)",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["set_goal", "list", "complete_checkpoint"],
        description: "action to perform",
      },
      title: { type: "string", description: "goal title (for set_goal)" },
      objective: { type: "string", description: "what to achieve (for set_goal)" },
      checkpoints: {
        type: "array",
        description: "list of checkpoint descriptions (for set_goal)",
      },
      mission_id: { type: "string", description: "mission ID (for complete_checkpoint)" },
      checkpoint_key: { type: "string", description: "checkpoint key (for complete_checkpoint)" },
    },
    required: ["action"],
  },
  execute: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const supabase = createServerClient();
    const action = args.action as string;

    switch (action) {
      case "set_goal": {
        const title = (args.title as string) ?? "untitled goal";
        const objective = (args.objective as string) ?? "";
        const checkpoints = (args.checkpoints as string[]) ?? [];
        const goal = await createGoal(supabase, ctx.tenant.id, title, objective, checkpoints);
        return { success: true, goal };
      }

      case "list": {
        const [activeMission, goals] = await Promise.all([
          getActiveMission(supabase, ctx.tenant.id),
          getGoals(supabase, ctx.tenant.id),
        ]);
        return { activeMission, goals };
      }

      case "complete_checkpoint": {
        const missionId = args.mission_id as string;
        const checkpointKey = args.checkpoint_key as string;
        if (!missionId || !checkpointKey) {
          return { error: "mission_id and checkpoint_key are required" };
        }
        await completeCheckpoint(supabase, missionId, checkpointKey);
        return { success: true };
      }

      default:
        return { error: `unknown action: ${action}` };
    }
  },
};
