import { createServerClient } from "@/supabase/client";

export async function getDashboardStats() {
  const supabase = createServerClient();
  const [tenants, sessions, messages, memories, evalRuns] = await Promise.all([
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", new Date(Date.now() - 86400000).toISOString()),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("memories").select("id", { count: "exact", head: true }),
    supabase
      .from("eval_runs")
      .select("avg_score")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    tenantCount: tenants.count ?? 0,
    activeSessionCount: sessions.count ?? 0,
    messageCount: messages.count ?? 0,
    memoryCount: memories.count ?? 0,
    lastEvalScore: evalRuns.data?.avg_score ?? null,
  };
}

export async function getAllTenants() {
  const supabase = createServerClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (!tenants || tenants.length === 0) return [];

  // Look up user emails from auth.users
  const userIds = [...new Set(tenants.map((t) => t.user_id as string))];
  const emailMap = await getUserEmails(supabase, userIds);

  return tenants.map((t) => ({
    ...t,
    user_email: emailMap.get(t.user_id as string) ?? null,
  }));
}

async function getUserEmails(
  supabase: ReturnType<typeof createServerClient>,
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (data?.users) {
      for (const user of data.users) {
        if (userIds.includes(user.id) && user.email) {
          map.set(user.id, user.email);
        }
      }
    }
  } catch {
    // auth.admin may not be available in all environments
  }
  return map;
}

export async function getTenantById(tenantId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();
  return data;
}

export async function getTenantSessions(tenantId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getTenantMessages(sessionId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getTenantMemories(
  tenantId: string,
  filters?: { category?: string; status?: string; type?: string; q?: string }
) {
  const supabase = createServerClient();
  let query = supabase
    .from("memories")
    .select("*")
    .eq("tenant_id", tenantId);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.type) query = query.eq("memory_type", filters.type);
  if (filters?.q) query = query.ilike("content", `%${filters.q}%`);
  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

export async function getTenantMissions(tenantId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("missions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getTenantWorkspaceFiles(tenantId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("workspace_files")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_deleted", false)
    .order("file_name");
  return data ?? [];
}

export async function getTenantCronJobs(tenantId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("cron_jobs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getEvalRuns() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("eval_runs")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getEvalRunDetail(runId: string) {
  const supabase = createServerClient();
  const [run, results] = await Promise.all([
    supabase.from("eval_runs").select("*").eq("id", runId).single(),
    supabase
      .from("eval_results")
      .select("*")
      .eq("run_id", runId)
      .order("scenario_key"),
  ]);
  return { run: run.data, results: results.data ?? [] };
}
