import type { ToolDefinition, AgentContext } from "../types";
import { createServerClient } from "@/supabase/client";
import { updateWorkspaceFile, WORKSPACE_FILE_NAMES } from "../workspace-files";

export const workspaceWriteTool: ToolDefinition = {
  name: "workspace_write",
  description:
    "update a workspace file. valid files: AGENTS.md, SOUL.md, USER.md, IDENTITY.md, BOOTSTRAP.md, HEARTBEAT.md, TOOLS.md",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "file name (e.g. IDENTITY.md)",
        enum: WORKSPACE_FILE_NAMES,
      },
      content: { type: "string", description: "new file content" },
    },
    required: ["file", "content"],
  },
  execute: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const fileName = args.file as string;
    const content = args.content as string;

    if (!WORKSPACE_FILE_NAMES.includes(fileName)) {
      throw new Error(
        `invalid workspace file: ${fileName}. valid files: ${WORKSPACE_FILE_NAMES.join(", ")}`
      );
    }

    const supabase = createServerClient();
    await updateWorkspaceFile(supabase, ctx.tenant.id, fileName, content);
    return { success: true, file: fileName };
  },
};
