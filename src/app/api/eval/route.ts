import { runEvals } from "@/eval/runner";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const run = await runEvals();
  return Response.json(run);
}

export const maxDuration = 300;
