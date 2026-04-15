import { createAuthServerClient } from "@/supabase/auth-client";
import { createServerClient } from "@/supabase/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServerClient();

  // Verify session belongs to user's tenant
  const { data: session } = await supabase
    .from("sessions")
    .select("id, tenant_id, tenants!inner(user_id)")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return Response.json([]);
  }

  const tenant = session.tenants as unknown as { user_id: string };
  if (tenant.user_id !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Fetch non-compacted messages
  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .is("compacted_at", null)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  return Response.json(
    (messages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }))
  );
}
