import { handleWebhook } from "@/lib/agent/platform-adapters";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const body = await req.json();

  // Always return 200 — never retry on lock failure
  try {
    await handleWebhook(platform, body);
  } catch (err) {
    console.error(`Webhook error for ${platform}:`, err);
  }

  return new Response("OK", { status: 200 });
}
