import { describe, it, expect } from "vitest";
import { parsePath } from "@/lib/agent/virtual-fs";

describe("parsePath", () => {
  it("parses /developers/alice", () => {
    expect(parsePath("/developers/alice")).toEqual({
      root: "/developers",
      subPath: "alice",
    });
  });

  it("parses /me with no subPath", () => {
    expect(parsePath("/me")).toEqual({
      root: "/me",
      subPath: null,
    });
  });

  it("parses /repos/my-repo.md", () => {
    expect(parsePath("/repos/my-repo.md")).toEqual({
      root: "/repos",
      subPath: "my-repo.md",
    });
  });

  it("handles path without leading slash", () => {
    expect(parsePath("developers/bob")).toEqual({
      root: "/developers",
      subPath: "bob",
    });
  });

  it("parses /connections/alice.md", () => {
    expect(parsePath("/connections/alice.md")).toEqual({
      root: "/connections",
      subPath: "alice.md",
    });
  });

  it("parses /me/profile.md", () => {
    expect(parsePath("/me/profile.md")).toEqual({
      root: "/me",
      subPath: "profile.md",
    });
  });
});
