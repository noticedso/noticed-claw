import { createAuthServerClient } from "@/supabase/auth-client";
import { createServerClient } from "@/supabase/client";
import { runAgentTurnStreaming } from "@/lib/agent/stream-bridge";

export async function POST(req: Request) {
  // 1. Authenticate — get user from session cookie
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse the user message
  const { messages } = await req.json();
  const lastUserMessage = messages.findLast(
    (m: { role: string }) => m.role === "user"
  );

  if (!lastUserMessage) {
    return new Response("No user message found", { status: 400 });
  }

  // 3. Resolve or create the user's tenant (service role for admin ops)
  const supabase = createServerClient();
  let { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!tenant) {
    // Auto-create tenant on first chat
    const { data: newTenant, error } = await supabase
      .from("tenants")
      .insert({
        user_id: user.id,
        name: user.email?.split("@")[0] ?? "user",
        config: {
          model: "gpt-4o-mini",
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
      return new Response(`Failed to create tenant: ${error.message}`, {
        status: 500,
      });
    }
    tenant = newTenant;
  }

  // 4. Build session key scoped to this user
  const sessionKey = `tenant:${tenant.id}:webchat:dm:${user.id}`;

  try {
    return await runAgentTurnStreaming(
      {
        tenantId: tenant.id,
        sessionKey,
        userMessage: lastUserMessage.content,
        platform: "webchat",
        chatType: "dm",
        peerId: user.id,
        dedupeKey: `webchat:${user.id}:${Date.now()}`,
      },
      messages
    );
  } catch (err) {
    const errMsg =
      err instanceof Error ? err.stack ?? err.message : JSON.stringify(err);
    console.error("Chat API error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const maxDuration = 300;
