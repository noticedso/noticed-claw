import { describe, it, expect } from "vitest";
import {
  shouldCompact,
  chunkMessages,
  COMPACTION_TOKEN_THRESHOLD,
  CHUNK_TOKEN_LIMIT,
} from "@/lib/agent/compaction";
import type { Message } from "@/lib/agent/types";

function makeMessage(tokenCount: number, id?: string): Message {
  return {
    id: id ?? crypto.randomUUID(),
    sessionId: "session-1",
    role: "user",
    content: "x".repeat(tokenCount * 4),
    tokenCount,
    compactedAt: null,
    createdAt: new Date().toISOString(),
  };
}

describe("shouldCompact", () => {
  it("returns true when tokens exceed threshold", () => {
    expect(shouldCompact(49000)).toBe(true);
  });

  it("returns false when tokens are below threshold", () => {
    expect(shouldCompact(47000)).toBe(false);
  });

  it("returns false at exact threshold (> not >=)", () => {
    expect(shouldCompact(48000)).toBe(false);
  });

  it("exports correct threshold value", () => {
    expect(COMPACTION_TOKEN_THRESHOLD).toBe(48000);
  });

  it("exports correct chunk limit", () => {
    expect(CHUNK_TOKEN_LIMIT).toBe(8000);
  });
});

describe("chunkMessages", () => {
  it("returns empty array for empty input", () => {
    expect(chunkMessages([], 8000)).toEqual([]);
  });

  it("puts small messages in one chunk", () => {
    const msgs = [makeMessage(1000), makeMessage(1000), makeMessage(1000)];
    const chunks = chunkMessages(msgs, 8000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(3);
  });

  it("splits messages across chunks when they exceed limit", () => {
    const msgs = [makeMessage(3000), makeMessage(3000), makeMessage(3000)];
    const chunks = chunkMessages(msgs, 8000);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(2); // 3000 + 3000 = 6000 < 8000
    expect(chunks[1]).toHaveLength(1); // 3000
  });

  it("handles single large message", () => {
    const msgs = [makeMessage(10000)];
    const chunks = chunkMessages(msgs, 8000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(1);
  });

  it("ensures no message appears in two chunks", () => {
    const msgs = [
      makeMessage(2000, "a"),
      makeMessage(2000, "b"),
      makeMessage(2000, "c"),
      makeMessage(2000, "d"),
      makeMessage(2000, "e"),
    ];
    const chunks = chunkMessages(msgs, 5000);
    const allIds = chunks.flat().map((m) => m.id);
    const uniqueIds = new Set(allIds);
    expect(allIds.length).toBe(uniqueIds.size);
    expect(allIds.length).toBe(5);
  });
});
