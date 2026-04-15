import { createAuthServerClient } from "@/supabase/auth-client";
import { createServerClient } from "@/supabase/client";

export async function GET() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServerClient();

  // Get tenant for this user
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!tenant) {
    return Response.json([]);
  }

  // Get all webchat sessions for this tenant
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, session_key, created_at, updated_at, total_tokens")
    .eq("tenant_id", tenant.id)
    .eq("channel", "webchat")
    .order("updated_at", { ascending: false });

  return Response.json(sessions ?? []);
}

export async function POST() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServerClient();

  // Get or create tenant
  let { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!tenant) {
    const { data: newTenant, error } = await supabase
      .from("tenants")
      .insert({
        user_id: user.id,
        name: user.email?.split("@")[0] ?? "user",
        config: {
          model: "gpt-4o",
          persona: "donna",
          heartbeatEnabled: false,
          heartbeatIntervalMs: 3600000,
          activeHoursStart: 9,
          activeHoursEnd: 21,
          timezone: "UTC",
          toolPolicy: {},
        },
      })
      .select()
      .single();
    if (error) {
      return new Response(error.message, { status: 500 });
    }
    tenant = newTenant;
  }

  if (!tenant) {
    return new Response("Failed to resolve tenant", { status: 500 });
  }

  // Create new session with unique key
  const sessionNum = Date.now();
  const sessionKey = `tenant:${tenant.id}:webchat:dm:${user.id}:${sessionNum}`;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      tenant_id: tenant.id,
      session_key: sessionKey,
      channel: "webchat",
      chat_type: "dm",
      total_tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      compaction_count: 0,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return Response.json(session);
}
