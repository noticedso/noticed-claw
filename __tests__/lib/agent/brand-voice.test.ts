// __tests__/lib/agent/brand-voice.test.ts
import { describe, it, expect } from "vitest";
import { BRAND_VOICE_RULES } from "@/lib/agent/brand-voice";

describe("brand-voice", () => {
  it("BRAND_VOICE_RULES is a non-empty string", () => {
    expect(typeof BRAND_VOICE_RULES).toBe("string");
    expect(BRAND_VOICE_RULES.length).toBeGreaterThan(0);
  });

  it("contains lowercase rule", () => {
    expect(BRAND_VOICE_RULES).toContain("lowercase");
  });

  it("contains no em dashes rule", () => {
    expect(BRAND_VOICE_RULES).toContain("no em dashes");
  });

  it("contains no emojis rule", () => {
    expect(BRAND_VOICE_RULES).toContain("no emojis");
  });

  it("contains concise rule", () => {
    expect(BRAND_VOICE_RULES).toContain("concise");
  });

  it("contains no filler rule", () => {
    expect(BRAND_VOICE_RULES).toContain("no filler");
  });

  it("contains assume more ask less rule", () => {
    expect(BRAND_VOICE_RULES).toContain("assume more, ask less");
  });
});
