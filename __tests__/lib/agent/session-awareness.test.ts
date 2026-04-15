import { describe, it, expect } from "vitest";
import {
  formatRelativeTime,
  formatSessionAwareness,
} from "@/lib/agent/session-awareness";
import type { SessionSummaryWithSession } from "@/lib/agent/types";

describe("formatRelativeTime", () => {
  it("formats 30 minutes ago", () => {
    const date = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe("30m ago");
  });

  it("formats 2 hours ago", () => {
    const date = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe("2h ago");
  });

  it("formats 3 days ago", () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe("3d ago");
  });

  it("formats just now for very recent", () => {
    const date = new Date(Date.now() - 10 * 1000).toISOString();
    expect(formatRelativeTime(date)).toBe("just now");
  });
});

describe("formatSessionAwareness", () => {
  it("returns 'no other active sessions' for empty array", () => {
    expect(formatSessionAwareness([])).toBe("no other active sessions");
  });

  it("formats summaries with channel, summary, and relative time", () => {
    const summaries: SessionSummaryWithSession[] = [
      {
        id: "1",
        tenantId: "t1",
        sessionId: "s1",
        summary: "discussed project architecture",
        source: "recent_messages",
        messageCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        session: {
          channel: "telegram",
          chatType: "dm",
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      },
    ];

    const result = formatSessionAwareness(summaries);
    expect(result).toContain("telegram/dm");
    expect(result).toContain("discussed project architecture");
    expect(result).toContain("2h ago");
  });
});
