import { describe, it, expect } from "vitest";
import {
  extractTelegramPayload,
  extractSlackPayload,
} from "@/lib/agent/platform-adapters";

describe("extractTelegramPayload", () => {
  it("extracts fields from a Telegram update", () => {
    const body = {
      message: {
        chat: { id: 12345, type: "private" },
        from: { id: 67890 },
        text: "hello noticed-claw",
      },
    };
    const result = extractTelegramPayload(body);
    expect(result).not.toBeNull();
    expect(result!.threadId).toBe("12345");
    expect(result!.peerId).toBe("67890");
    expect(result!.userMessage).toBe("hello noticed-claw");
    expect(result!.chatType).toBe("dm");
    expect(result!.platform).toBe("telegram");
  });

  it("returns dm for private chat type", () => {
    const body = {
      message: {
        chat: { id: 1, type: "private" },
        from: { id: 2 },
        text: "hi",
      },
    };
    expect(extractTelegramPayload(body)!.chatType).toBe("dm");
  });

  it("returns group for group chat type", () => {
    const body = {
      message: {
        chat: { id: 1, type: "group" },
        from: { id: 2 },
        text: "hi",
      },
    };
    expect(extractTelegramPayload(body)!.chatType).toBe("group");
  });

  it("returns null when no message", () => {
    expect(extractTelegramPayload({})).toBeNull();
  });

  it("returns null when no text", () => {
    const body = {
      message: { chat: { id: 1 }, from: { id: 2 } },
    };
    expect(extractTelegramPayload(body)).toBeNull();
  });
});

describe("extractSlackPayload", () => {
  it("extracts fields from a Slack event", () => {
    const body = {
      event: {
        type: "message",
        channel: "C123",
        user: "U456",
        text: "hello",
      },
    };
    const result = extractSlackPayload(body);
    expect(result).not.toBeNull();
    expect(result!.threadId).toBe("C123");
    expect(result!.peerId).toBe("U456");
    expect(result!.userMessage).toBe("hello");
  });

  it("returns null for url_verification", () => {
    const body = { type: "url_verification", challenge: "abc" };
    expect(extractSlackPayload(body)).toBeNull();
  });

  it("returns null for bot messages (subtype present)", () => {
    const body = {
      event: {
        type: "message",
        subtype: "bot_message",
        channel: "C1",
        text: "hi",
      },
    };
    expect(extractSlackPayload(body)).toBeNull();
  });

  it("returns null when no event", () => {
    expect(extractSlackPayload({})).toBeNull();
  });
});
