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

  const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
  const tenantId = tenant?.id ?? crypto.randomUUID();
  const userId = tenant?.user_id ?? DEMO_USER_ID;

  const sessionKey = `tenant:${tenantId}:webchat:dm:${userId}`;

  try {
    return await runAgentTurnStreaming({
      tenantId,
      sessionKey,
      userMessage: lastUserMessage.content,
      platform: "webchat",
      chatType: "dm",
      peerId: userId,
      dedupeKey: `webchat:${userId}:${Date.now()}`,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.stack ?? err.message : JSON.stringify(err);
    console.error("Chat API error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const maxDuration = 300;
