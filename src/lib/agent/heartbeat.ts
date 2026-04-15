import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tenant } from "./types";

export function isWithinActiveHours(
  now: Date,
  startHour: number,
  endHour: number,
  timezone: string
): boolean {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: timezone,
  });
  const currentHour = parseInt(formatter.format(now), 10);
  return currentHour >= startHour && currentHour < endHour;
}

export async function processHeartbeats(
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

  // Find tenants with due heartbeats
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("*")
    .lte("next_heartbeat_at", now.toISOString())
    .not("next_heartbeat_at", "is", null);

  if (error) throw error;
  if (!tenants || tenants.length === 0) return;

  for (const row of tenants) {
    const tenant: Tenant = {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      config: row.config,
      nextHeartbeatAt: row.next_heartbeat_at,
      createdAt: row.created_at,
    };

    if (!tenant.config.heartbeatEnabled) continue;

    // Check active hours
    if (
      !isWithinActiveHours(
        now,
        tenant.config.activeHoursStart,
        tenant.config.activeHoursEnd,
        tenant.config.timezone
      )
    ) {
      // Reschedule to next active hours start
      const nextRun = new Date(
        now.getTime() + tenant.config.heartbeatIntervalMs
      );
      await supabase
        .from("tenants")
        .update({ next_heartbeat_at: nextRun.toISOString() })
        .eq("id", tenant.id);
      continue;
    }

    // Run heartbeat turn
    const sessionKey = `tenant:${tenant.id}:heartbeat:system:heartbeat`;

    try {
      await runAgentTurn({
        tenantId: tenant.id,
        sessionKey,
        userMessage: "[HEARTBEAT] Check if there is anything worth reaching out about.",
        platform: "heartbeat",
        chatType: "system",
        peerId: "heartbeat",
      });
    } catch (err) {
      console.error(`Heartbeat failed for tenant ${tenant.id}:`, err);
    }

    // Update next heartbeat time
    const nextHeartbeat = new Date(
      now.getTime() + tenant.config.heartbeatIntervalMs
    );
    await supabase
      .from("tenants")
      .update({ next_heartbeat_at: nextHeartbeat.toISOString() })
      .eq("id", tenant.id);
  }
}
