import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mission, MissionType, MissionStatus, Checkpoint } from "./types";

export interface MissionTemplate {
  type: MissionType;
  title: string;
  objective: string;
  checkpoints: Array<{ key: string; description: string }>;
}

export const MISSION_CATALOG: MissionTemplate[] = [
  {
    type: "onboarding",
    title: "get set up",
    objective: "configure your agent persona and workspace",
    checkpoints: [
      { key: "persona_selected", description: "choose a persona (ari, donna, or ted)" },
      { key: "identity_updated", description: "update your IDENTITY.md with your info" },
      { key: "first_search", description: "browse your developer network" },
    ],
  },
  {
    type: "audience_building",
    title: "build your network map",
    objective: "explore and understand your developer connections",
    checkpoints: [
      { key: "browse_connections", description: "view your connections list" },
      { key: "find_skill_match", description: "find developers with specific skills" },
      { key: "review_repos", description: "review shared repositories" },
    ],
  },
  {
    type: "outreach",
    title: "engage your network",
    objective: "start meaningful conversations with your connections",
    checkpoints: [
      { key: "draft_message", description: "draft a message to a connection" },
      { key: "schedule_followup", description: "set up a cron job for follow-up reminders" },
      { key: "track_response", description: "log a response from a connection" },
    ],
  },
];

export const MISSION_ORDER: MissionType[] = ["onboarding", "audience_building", "outreach"];

export function getNextMissionType(current: MissionType | null): MissionType | null {
  if (!current) return "onboarding";
  const idx = MISSION_ORDER.indexOf(current);
  return idx < MISSION_ORDER.length - 1 ? MISSION_ORDER[idx + 1] : null;
}

export function getMissionTemplate(type: MissionType): MissionTemplate {
  const template = MISSION_CATALOG.find((m) => m.type === type);
  if (!template) throw new Error(`Unknown mission type: ${type}`);
  return template;
}

export async function getActiveMission(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Mission | null> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("kind", "mission")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapMissionRow(data);
}

export async function getGoals(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Mission[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("kind", "goal")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapMissionRow);
}

export async function createMission(
  supabase: SupabaseClient,
  tenantId: string,
  type: MissionType
): Promise<Mission> {
  const template = getMissionTemplate(type);
  const checkpoints: Checkpoint[] = template.checkpoints.map((cp) => ({
    key: cp.key,
    description: cp.description,
    completed: false,
  }));

  const { data, error } = await supabase
    .from("missions")
    .insert({
      tenant_id: tenantId,
      kind: "mission",
      mission_type: type,
      status: "active" as MissionStatus,
      title: template.title,
      objective: template.objective,
      checkpoints,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return mapMissionRow(data);
}

export async function createGoal(
  supabase: SupabaseClient,
  tenantId: string,
  title: string,
  objective: string,
  checkpointDescriptions?: string[]
): Promise<Mission> {
  const checkpoints: Checkpoint[] = (checkpointDescriptions ?? []).map((desc, i) => ({
    key: `step_${i + 1}`,
    description: desc,
    completed: false,
  }));

  const { data, error } = await supabase
    .from("missions")
    .insert({
      tenant_id: tenantId,
      kind: "goal",
      mission_type: null,
      status: "active" as MissionStatus,
      title,
      objective,
      checkpoints,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return mapMissionRow(data);
}

export async function completeCheckpoint(
  supabase: SupabaseClient,
  missionId: string,
  checkpointKey: string
): Promise<void> {
  const { data: mission, error: fetchError } = await supabase
    .from("missions")
    .select("checkpoints")
    .eq("id", missionId)
    .single();

  if (fetchError) throw fetchError;

  const checkpoints = (mission.checkpoints as Checkpoint[]).map((cp) => {
    if (cp.key === checkpointKey && !cp.completed) {
      return { ...cp, completed: true, completedAt: new Date().toISOString() };
    }
    return cp;
  });

  const allCompleted = checkpoints.every((cp) => cp.completed);

  const { error } = await supabase
    .from("missions")
    .update({
      checkpoints,
      status: allCompleted ? "completed" : "active",
      completed_at: allCompleted ? new Date().toISOString() : null,
    })
    .eq("id", missionId);

  if (error) throw error;
}

function mapMissionRow(row: Record<string, unknown>): Mission {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    kind: row.kind as Mission["kind"],
    missionType: row.mission_type as Mission["missionType"],
    status: row.status as Mission["status"],
    title: row.title as string,
    objective: row.objective as string,
    checkpoints: row.checkpoints as Checkpoint[],
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
