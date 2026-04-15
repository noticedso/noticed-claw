// __tests__/lib/agent/session-manager.test.ts
import { describe, it, expect } from "vitest";
import { buildSessionKey, parseSessionKey } from "@/lib/agent/session-manager";

describe("session-manager", () => {
  describe("buildSessionKey", () => {
    it("returns correctly formatted key", () => {
      const key = buildSessionKey("tenant-123", "telegram", "dm", "peer-456");
      expect(key).toBe("tenant:tenant-123:telegram:dm:peer-456");
    });

    it("handles webchat channel", () => {
      const key = buildSessionKey("t1", "webchat", "dm", "user-abc");
      expect(key).toBe("tenant:t1:webchat:dm:user-abc");
    });

    it("handles group chat type", () => {
      const key = buildSessionKey("t1", "telegram", "group", "group-789");
      expect(key).toBe("tenant:t1:telegram:group:group-789");
    });
  });

  describe("parseSessionKey", () => {
    it("roundtrips with buildSessionKey", () => {
      const key = buildSessionKey("tenant-123", "telegram", "dm", "peer-456");
      const parsed = parseSessionKey(key);
      expect(parsed).toEqual({
        tenantId: "tenant-123",
        channel: "telegram",
        chatType: "dm",
        peerId: "peer-456",
      });
    });

    it("handles colons in peerId gracefully", () => {
      // peerId might contain colons (e.g. composite IDs)
      const key = "tenant:t1:slack:dm:U123:thread:abc";
      const parsed = parseSessionKey(key);
      expect(parsed.tenantId).toBe("t1");
      expect(parsed.channel).toBe("slack");
      expect(parsed.chatType).toBe("dm");
      // Everything after the 4th colon is the peerId
      expect(parsed.peerId).toBe("U123:thread:abc");
    });

    it("parses a simple key", () => {
      const parsed = parseSessionKey("tenant:t1:webchat:dm:user1");
      expect(parsed.tenantId).toBe("t1");
      expect(parsed.channel).toBe("webchat");
      expect(parsed.chatType).toBe("dm");
      expect(parsed.peerId).toBe("user1");
    });
  });
});
