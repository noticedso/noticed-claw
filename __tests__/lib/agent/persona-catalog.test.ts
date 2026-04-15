// __tests__/lib/agent/persona-catalog.test.ts
import { describe, it, expect } from "vitest";
import { PERSONAS, DEFAULT_PERSONA, getPersona } from "@/lib/agent/persona-catalog";
import type { PersonaKey } from "@/lib/agent/types";

describe("persona-catalog", () => {
  it("PERSONAS has ari, donna, ted keys", () => {
    expect(Object.keys(PERSONAS)).toEqual(
      expect.arrayContaining(["ari", "donna", "ted"])
    );
    expect(Object.keys(PERSONAS)).toHaveLength(3);
  });

  it("each persona has key, voice, style, and non-empty traits", () => {
    for (const key of Object.keys(PERSONAS) as PersonaKey[]) {
      const persona = PERSONAS[key];
      expect(persona.key).toBe(key);
      expect(typeof persona.voice).toBe("string");
      expect(persona.voice.length).toBeGreaterThan(0);
      expect(typeof persona.style).toBe("string");
      expect(persona.style.length).toBeGreaterThan(0);
      expect(Array.isArray(persona.traits)).toBe(true);
      expect(persona.traits.length).toBeGreaterThan(0);
    }
  });

  it("DEFAULT_PERSONA is donna", () => {
    expect(DEFAULT_PERSONA).toBe("donna");
  });

  it("getPersona('ari') returns ari", () => {
    const persona = getPersona("ari");
    expect(persona.key).toBe("ari");
    expect(persona.style).toBe("enforcer");
  });

  it("getPersona('donna') returns donna", () => {
    const persona = getPersona("donna");
    expect(persona.key).toBe("donna");
    expect(persona.style).toBe("strategist");
  });

  it("getPersona('ted') returns ted", () => {
    const persona = getPersona("ted");
    expect(persona.key).toBe("ted");
    expect(persona.style).toBe("cheerleader");
  });

  it("getPersona('invalid') returns donna (default)", () => {
    const persona = getPersona("invalid");
    expect(persona.key).toBe("donna");
  });

  it("getPersona('') returns donna (default)", () => {
    const persona = getPersona("");
    expect(persona.key).toBe("donna");
  });
});
