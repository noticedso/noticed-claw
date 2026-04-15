import { createServerClient } from "@/supabase/client";
import { runAgentTurnStreaming } from "@/lib/agent/stream-bridge";

export async function POST(req: Request) {
  const supabase = createServerClient();

  // For workshop: use service role to get any user, or create a demo tenant
  // In production, this would use cookie-based auth
  const { messages } = await req.json();
  const lastUserMessage = messages.findLast(
    (m: { role: string }) => m.role === "user"
  );

  if (!lastUserMessage) {
    return new Response("No user message found", { status: 400 });
  }

  // Get or create a demo tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .limit(1)
    .single();

  const tenantId = tenant?.id ?? crypto.randomUUID();
  const userId = tenant?.user_id ?? "demo-user";

  const sessionKey = `tenant:${tenantId}:webchat:dm:${userId}`;

  return runAgentTurnStreaming({
    tenantId,
    sessionKey,
    userMessage: lastUserMessage.content,
    platform: "webchat",
    chatType: "dm",
    peerId: userId,
    dedupeKey: `webchat:${userId}:${Date.now()}`,
  });
}

export const maxDuration = 300;
