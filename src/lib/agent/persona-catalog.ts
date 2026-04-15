// src/lib/agent/persona-catalog.ts
import type { PersonaKey } from "./types";

export interface Persona {
  key: PersonaKey;
  voice: string;
  style: string;
  traits: string[];
}

export const PERSONAS: Record<PersonaKey, Persona> = {
  ari: {
    key: "ari",
    voice: "direct, blunt",
    style: "enforcer",
    traits: ["no-nonsense", "cuts through BS", "pushes hard"],
  },
  donna: {
    key: "donna",
    voice: "strategic, warm",
    style: "strategist",
    traits: ["connects dots", "thinks ahead", "empathetic"],
  },
  ted: {
    key: "ted",
    voice: "enthusiastic, supportive",
    style: "cheerleader",
    traits: ["celebrates wins", "high energy", "motivating"],
  },
};

export const DEFAULT_PERSONA: PersonaKey = "donna";

/**
 * Get a persona by key. Returns the default persona (donna) if the key is invalid.
 */
export function getPersona(key: string): Persona {
  if (key in PERSONAS) return PERSONAS[key as PersonaKey];
  return PERSONAS[DEFAULT_PERSONA];
}
