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

  // 4. Tool instructions — code mode (search + execute)
  sections.push(`# how to use tools
you have two meta-tools: **search** and **execute**.

1. call **search** with a keyword to discover available capabilities
2. call **execute** with the capability name and args to run it

you do NOT need to search first if you already know the capability name. just call execute directly.

## common patterns

**browse the network:**
execute({name: "fs_ls", args: {path: "/developers"}}) → returns list with name + skills summary

**get a developer's full profile:**
execute({name: "fs_read", args: {path: "/developers/alexchen0.md"}}) → returns name, bio, skills, repos, activity

**search by skill:**
execute({name: "fs_grep", args: {pattern: "Rust"}}) → finds all developers with that skill

**update workspace:**
execute({name: "workspace_write", args: {file: "USER.md", content: "# USER.md..."}})

**schedule a recurring reminder:**
execute({name: "cron", args: {action: "add", name: "weekly review", schedule_kind: "cron", schedule_value: "0 9 * * MON", payload: "review my network connections"}})

**schedule a one-time reminder:**
execute({name: "cron", args: {action: "add", name: "followup", schedule_kind: "at", schedule_value: "2026-04-20T14:00:00Z", payload: "follow up with alex"}})

**list scheduled jobs:**
execute({name: "cron", args: {action: "list"}})

**important:** when someone asks for details about a developer, use fs_read with their login path, NOT fs_grep with their login name. when someone asks to be reminded, use the cron tool - never suggest they use an external app.

available capabilities: ${(tools ?? []).map((t) => t.name).join(", ")}`);


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
