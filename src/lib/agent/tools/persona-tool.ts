import type { ToolDefinition, AgentContext, PersonaKey } from "../types";
import { createServerClient } from "@/supabase/client";
import { PERSONAS } from "../persona-catalog";

const VALID_PERSONAS = Object.keys(PERSONAS) as PersonaKey[];

export const personaTool: ToolDefinition = {
  name: "switch_persona",
  description:
    "switch the agent's persona. available personas: ari (direct, blunt enforcer), donna (strategic, warm strategist), ted (enthusiastic, supportive cheerleader)",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      persona: {
        type: "string",
        description: "persona key to switch to",
        enum: VALID_PERSONAS,
      },
    },
    required: ["persona"],
  },
  execute: async (args: Record<string, unknown>, ctx: AgentContext) => {
    const persona = args.persona as string;

    if (!VALID_PERSONAS.includes(persona as PersonaKey)) {
      throw new Error(
        `invalid persona: ${persona}. valid personas: ${VALID_PERSONAS.join(", ")}`
      );
    }

    const supabase = createServerClient();
    const newConfig = { ...ctx.tenant.config, persona };

    const { error } = await supabase
      .from("tenants")
      .update({ config: newConfig })
      .eq("id", ctx.tenant.id);

    if (error) throw new Error(`failed to switch persona: ${error.message}`);

    const selected = PERSONAS[persona as PersonaKey];
    return {
      success: true,
      persona: selected.key,
      voice: selected.voice,
      style: selected.style,
    };
  },
};
