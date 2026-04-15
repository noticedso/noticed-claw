import type { AgentContext, ToolDefinition } from "./types";
import { BRAND_VOICE_RULES } from "./brand-voice";
import { getPersona } from "./persona-catalog";
import { formatSessionAwareness } from "./session-awareness";

export type PromptMode = "full" | "minimal" | "none";

export function buildSystemPrompt(
  ctx: AgentContext,
  mode: PromptMode,
  tools?: ToolDefinition[],
): string {
  if (mode === "none") return "";

  const sections: string[] = [];

  // 1. Identity
  sections.push(
    "# identity\nyou are noticed-claw, a developer intelligence agent.",
  );

  // 2. Brand voice (immutable, always present)
  sections.push(`# brand voice\n${BRAND_VOICE_RULES}`);

  // 3. Persona overlay
  const persona = getPersona(ctx.tenant.config.persona);
  sections.push(
    `# persona: ${persona.key}\nvoice: ${persona.voice}\nstyle: ${persona.style}\ntraits: ${persona.traits.join(", ")}`,
  );

  if (mode === "minimal") return sections.join("\n\n");

  // 4. Tool instructions
  if (tools && tools.length > 0) {
    const toolList = tools
      .map((t) => `- **${t.name}**: ${t.description}`)
      .join("\n");
    sections.push(`# available tools\n${toolList}`);
  }

  // 5. Memory recall
  if (ctx.memories.length > 0) {
    const memoryLines = ctx.memories
      .map(
        (m) =>
          `- [${m.category}] ${m.content} (relevance: ${(m.similarity * 100).toFixed(0)}%)`,
      )
      .join("\n");
    sections.push(`# relevant memories\n${memoryLines}`);
  }

  // 6. Workspace files
  if (ctx.workspaceFiles.length > 0) {
    const wsContent = ctx.workspaceFiles
      .filter((f) => !f.isDeleted)
      .map((f) => `## ${f.fileName}\n${f.content}`)
      .join("\n\n");
    sections.push(`# workspace\n${wsContent}`);
  }

  // 7. Mission context
  if (ctx.activeMission) {
    const m = ctx.activeMission;
    const completed = m.checkpoints.filter((cp) => cp.completed).length;
    const total = m.checkpoints.length;
    const checkpointList = m.checkpoints
      .map((cp) => `- [${cp.completed ? "x" : " "}] ${cp.description}`)
      .join("\n");
    sections.push(
      `# active mission: ${m.title}\nobjective: ${m.objective}\nprogress: ${completed}/${total}\n${checkpointList}`,
    );
  }

  if (ctx.goals.length > 0) {
    const goalList = ctx.goals
      .map((g) => `- ${g.title}: ${g.objective}`)
      .join("\n");
    sections.push(`# goals\n${goalList}`);
  }

  // 8. Session awareness
  if (ctx.sessionSummaries.length > 0) {
    sections.push(
      `# your other sessions\n${formatSessionAwareness(ctx.sessionSummaries)}`,
    );
  }

  // 9. Runtime info
  const now = new Date();
  sections.push(
    `# runtime\ncurrent time: ${now.toISOString()}\ntimezone: ${ctx.tenant.config.timezone}\ntenant: ${ctx.tenant.name}`,
  );

  return sections.join("\n\n");
}
