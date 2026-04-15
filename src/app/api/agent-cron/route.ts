import { createServerClient } from "@/supabase/client";
import { processHeartbeats } from "@/lib/agent/heartbeat";
import { processCronJobs } from "@/lib/agent/cron";
import { runAgentTurn } from "@/lib/agent/agent-turn";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServerClient();

  const turnRunner = async (input: {
    tenantId: string;
    sessionKey: string;
    userMessage: string;
    platform: string;
    chatType: string;
    peerId: string;
  }) => {
    return runAgentTurn({
      ...input,
      dedupeKey: `cron:${input.peerId}:${Date.now()}`,
    });
  };

  await Promise.allSettled([
    processHeartbeats(supabase, turnRunner),
    processCronJobs(supabase, turnRunner),
  ]);

  return new Response("OK", { status: 200 });
}

export const maxDuration = 300;
