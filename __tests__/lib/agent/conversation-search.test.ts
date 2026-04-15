import { describe, it, expect, vi } from "vitest";

// Mock supabase
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom } as never;

import { searchMessages, browseSession } from "@/lib/agent/conversation-search";

describe("searchMessages", () => {
  it("returns empty array when tenant has no sessions", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const result = await searchMessages(mockSupabase, "tenant-1", "hello");
    expect(result).toEqual([]);
  });

  it("builds ILIKE query with search term", async () => {
    const ilikeFn = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "session-1" }],
            error: null,
          }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            ilike: ilikeFn,
          }),
        }),
      });

    await searchMessages(mockSupabase, "tenant-1", "test query");
    expect(ilikeFn).toHaveBeenCalledWith("content", "%test query%");
  });

  it("respects limit parameter", async () => {
    const limitFn = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "s1" }],
            error: null,
          }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: limitFn,
              }),
            }),
          }),
        }),
      });

    await searchMessages(mockSupabase, "t1", "q", 10);
    expect(limitFn).toHaveBeenCalledWith(10);
  });
});

describe("browseSession", () => {
  it("uses default offset 0 and limit 50", async () => {
    const rangeFn = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: rangeFn,
            }),
          }),
        }),
      }),
    });

    await browseSession(mockSupabase, "session-1");
    expect(rangeFn).toHaveBeenCalledWith(0, 49);
  });

  it("respects custom offset and limit", async () => {
    const rangeFn = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: rangeFn,
            }),
          }),
        }),
      }),
    });

    await browseSession(mockSupabase, "session-1", 10, 25);
    expect(rangeFn).toHaveBeenCalledWith(10, 34);
  });
});
