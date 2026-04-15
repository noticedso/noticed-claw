import { Cron } from "croner";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScheduleKind, CronJob } from "./types";

export function calculateNextRun(
  kind: ScheduleKind,
  value: string,
  timezone: string
): Date {
  if (kind === "at") return new Date(value);
  if (kind === "every") return new Date(Date.now() + parseInt(value, 10));
  // kind === "cron"
  const job = new Cron(value, { timezone, maxRuns: 1 });
  const next = job.nextRun();
  if (!next) throw new Error(`Invalid cron expression: ${value}`);
  return next;
}

export function isDue(nextRunAt: string | null): boolean {
  if (!nextRunAt) return false;
  return new Date(nextRunAt).getTime() <= Date.now();
}

export async function processCronJobs(
  supabase: SupabaseClient,
  runAgentTurn: (input: {
    tenantId: string;
    sessionKey: string;
    userMessage: string;
    platform: string;
    chatType: string;
    peerId: string;
  }) => Promise<{ content: string | null; silent: boolean }>
): Promise<void> {
  const now = new Date();

  const { data: jobs, error } = await supabase
    .from("cron_jobs")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", now.toISOString());

  if (error) throw error;
  if (!jobs || jobs.length === 0) return;

  for (const row of jobs) {
    const job: CronJob = mapCronJobRow(row);

    const sessionKey =
      job.sessionTarget === "isolated"
        ? `tenant:${job.tenantId}:cron:isolated:${job.id}`
        : `tenant:${job.tenantId}:cron:main:${job.tenantId}`;

    try {
      await runAgentTurn({
        tenantId: job.tenantId,
        sessionKey,
        userMessage: `[CRON: ${job.name}] ${job.payloadText}`,
        platform: "cron",
        chatType: "system",
        peerId: job.id,
      });
    } catch (err) {
      console.error(`Cron job ${job.id} failed:`, err);
    }

    // Calculate next run and update
    let nextRunAt: string | null = null;
    if (job.scheduleKind !== "at") {
      nextRunAt = calculateNextRun(
        job.scheduleKind,
        job.scheduleValue,
        job.scheduleTimezone
      ).toISOString();
    }

    await supabase
      .from("cron_jobs")
      .update({
        next_run_at: nextRunAt,
        last_run_at: now.toISOString(),
        run_count: job.runCount + 1,
        enabled: job.scheduleKind === "at" ? false : true, // one-shots disable after firing
      })
      .eq("id", job.id);
  }
}

function mapCronJobRow(row: Record<string, unknown>): CronJob {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    scheduleKind: row.schedule_kind as ScheduleKind,
    scheduleValue: row.schedule_value as string,
    scheduleTimezone: row.schedule_timezone as string,
    sessionTarget: row.session_target as CronJob["sessionTarget"],
    payloadText: row.payload_text as string,
    enabled: row.enabled as boolean,
    nextRunAt: (row.next_run_at as string) ?? null,
    lastRunAt: (row.last_run_at as string) ?? null,
    runCount: (row.run_count as number) ?? 0,
    createdAt: row.created_at as string,
  };
}
