import { runAgentTurn } from "./agent-turn";
import { createServerClient } from "@/supabase/client";

export interface WebhookPayload {
  tenantId: string;
  threadId: string;
  userMessage: string;
  peerId: string;
  chatType: "dm" | "group";
  platform: string;
}

export function extractTelegramPayload(
  body: Record<string, unknown>
): WebhookPayload | null {
  const message = body.message as Record<string, unknown> | undefined;
  if (!message) return null;

  const chat = message.chat as Record<string, unknown>;
  const from = message.from as Record<string, unknown>;
  const text = message.text as string;

  if (!text) return null;

  return {
    tenantId: "", // resolved later from platform config
    threadId: String(chat.id),
    userMessage: text,
    peerId: String(from.id),
    chatType: chat.type === "private" ? "dm" : "group",
    platform: "telegram",
  };
}

export function extractSlackPayload(
  body: Record<string, unknown>
): WebhookPayload | null {
  // Handle Slack URL verification challenge
  if (body.type === "url_verification") return null;

  const event = body.event as Record<string, unknown> | undefined;
  if (!event || event.type !== "message") return null;
  if (event.subtype) return null; // Ignore bot messages, edits, etc.

  return {
    tenantId: "", // resolved later
    threadId: event.channel as string,
    userMessage: event.text as string,
    peerId: event.user as string,
    chatType: "dm",
    platform: "slack",
  };
}

export async function handleWebhook(
  platform: string,
  body: unknown
): Promise<void> {
  const rawBody = body as Record<string, unknown>;
  let payload: WebhookPayload | null = null;

  switch (platform) {
    case "telegram":
      payload = extractTelegramPayload(rawBody);
      break;
    case "slack":
      payload = extractSlackPayload(rawBody);
      break;
    default:
      console.warn(`Unknown platform: ${platform}`);
      return;
  }

  if (!payload) return;

  // Look up tenant by platform config (simplified for workshop)
  const supabase = createServerClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .single();

  if (!tenant) {
    console.error("No tenant found for webhook");
    return;
  }

  payload.tenantId = tenant.id;

  const sessionKey = `tenant:${tenant.id}:${platform}:${payload.chatType}:${payload.peerId}`;

  const result = await runAgentTurn({
    tenantId: tenant.id,
    sessionKey,
    userMessage: payload.userMessage,
    platform,
    chatType: payload.chatType,
    peerId: payload.peerId,
    dedupeKey: `${platform}:${payload.threadId}:${Date.now()}`,
  });

  // Deliver reply back to platform
  if (result.content && !result.silent) {
    await deliverReply(platform, payload.threadId, result.content);
  }
}

export async function deliverReply(
  platform: string,
  threadId: string,
  content: string
): Promise<void> {
  switch (platform) {
    case "telegram": {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return;
      // eslint-disable-next-line custom/no-fetch-in-services-hooks-components
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: threadId, text: content }),
      });
      break;
    }
    case "slack": {
      const token = process.env.SLACK_BOT_TOKEN;
      if (!token) return;
      // eslint-disable-next-line custom/no-fetch-in-services-hooks-components
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channel: threadId, text: content }),
      });
      break;
    }
  }
}
