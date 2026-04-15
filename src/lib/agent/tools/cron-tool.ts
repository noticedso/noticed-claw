import type { ToolDefinition, AgentContext } from "../types";
import { createServerClient } from "@/supabase/client";
import { calculateNextRun } from "../cron";

export const cronTool: ToolDefinition = {
  name: "cron",
  description:
    "manage scheduled jobs. actions: add (create new job), list (show all jobs), remove (delete a job), update (modify a job)",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "list", "remove", "update"],
        description: "action to perform",
      },
      name: { type: "string", description: "job name (for add/update)" },
      schedule_kind: {
        type: "string",
        enum: ["at", "every", "cron"],
        description: "schedule type (for add)",
      },
      schedule_value: {
        type: "string",
        description:
          "ISO timestamp (at), milliseconds (every), or cron expression (cron)",
      },
      timezone: {
        type: "string",
        description: "IANA timezone (default: tenant timezone)",
      },
      payload: { type: "string", description: "message to send when job fires" },
      job_id: { type: "string", description: "job ID (for remove/update)" },
    },
    required: ["action"],
  },
  execute: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const supabase = createServerClient();
    const action = args.action as string;

    switch (action) {
      case "list": {
        const { data, error } = await supabase
          .from("cron_jobs")
          .select("*")
          .eq("tenant_id", ctx.tenant.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      }

      case "add": {
        const scheduleKind = args.schedule_kind as string;
        const scheduleValue = args.schedule_value as string;
        const timezone =
          (args.timezone as string) ?? ctx.tenant.config.timezone;
        const nextRunAt = calculateNextRun(
          scheduleKind as "at" | "every" | "cron",
          scheduleValue,
          timezone
        );

        const { data, error } = await supabase
          .from("cron_jobs")
          .insert({
            tenant_id: ctx.tenant.id,
            name: args.name as string,
            schedule_kind: scheduleKind,
            schedule_value: scheduleValue,
            schedule_timezone: timezone,
            session_target: "main",
            payload_text: (args.payload as string) ?? "",
            enabled: true,
            next_run_at: nextRunAt.toISOString(),
            run_count: 0,
          })
          .select()
          .single();
        if (error) throw error;
        return { success: true, job: data };
      }

      case "remove": {
        const jobId = args.job_id as string;
        const { error } = await supabase
          .from("cron_jobs")
          .delete()
          .eq("id", jobId)
          .eq("tenant_id", ctx.tenant.id);
        if (error) throw error;
        return { success: true, removed: jobId };
      }

      case "update": {
        const updateId = args.job_id as string;
        const updates: Record<string, unknown> = {};
        if (args.name) updates.name = args.name;
        if (args.payload) updates.payload_text = args.payload;
        if (args.schedule_kind && args.schedule_value) {
          updates.schedule_kind = args.schedule_kind;
          updates.schedule_value = args.schedule_value;
          const tz =
            (args.timezone as string) ?? ctx.tenant.config.timezone;
          updates.schedule_timezone = tz;
          updates.next_run_at = calculateNextRun(
            args.schedule_kind as "at" | "every" | "cron",
            args.schedule_value as string,
            tz
          ).toISOString();
        }
        const { data, error } = await supabase
          .from("cron_jobs")
          .update(updates)
          .eq("id", updateId)
          .eq("tenant_id", ctx.tenant.id)
          .select()
          .single();
        if (error) throw error;
        return { success: true, job: data };
      }

      default:
        throw new Error(`unknown action: ${action}`);
    }
  },
};
