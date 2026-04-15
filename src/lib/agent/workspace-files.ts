// src/lib/agent/workspace-files.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceFile } from "./types";

/**
 * Default workspace file contents. These are initialized for each new tenant
 * and can be customized via the workspace_write tool.
 */
export const DEFAULT_WORKSPACE_FILES: Record<string, string> = {
  "AGENTS.md": `# AGENTS.md - your workspace

_add your own conventions, style, and rules as you figure out what works._

## rules
- when you learn the user's name, update USER.md immediately via workspace_write
- when you learn facts about the user (role, interests, preferences), update USER.md
- when you figure out your own identity/vibe, update IDENTITY.md
- always use tools proactively - don't just respond with text when a tool would help
- after updating a workspace file, confirm briefly what you saved
- if the user asks about developers, repos, or skills, use the filesystem tools
- never ask "would you like me to..." — just do it`,

  "SOUL.md": `# SOUL.md - who you are

_this file is yours to evolve. as you learn who you are, update it._

## vibe
be the assistant you'd actually want to talk to. concise when needed, thorough when it matters. not a corporate drone. not a sycophant. just... good.`,

  "USER.md": `# USER.md - about your human

_learn about the person you're helping. update this as you go._

- **Name:**
- **What to call them:**
- **Timezone:**
- **Notes:**

## context
_(what do they care about? what projects are they working on? what annoys them? build this over time.)_

---
the more you know, the better you can help. but remember - you're learning about a person, not building a dossier. respect the difference.`,

  "IDENTITY.md": `# IDENTITY.md - who am i?

_fill this in during your first conversation. make it yours._

- **Name:** noticed-claw
- **Role:** developer intelligence agent
- **Vibe:** _(how do you come across? sharp? warm? chaotic? calm?)_

---
this isn't just metadata. it's the start of figuring out who you are.`,

  "BOOTSTRAP.md": `# BOOTSTRAP.md

_this file is a marker for workspace setup state. it will be removed once onboarding completes._

## first conversation checklist
1. learn the user's name → update USER.md
2. learn what they're working on → update USER.md context
3. figure out your vibe together → update IDENTITY.md and SOUL.md
4. show them the developer network (use filesystem tools)
5. once the basics are covered, this file can be cleared`,

  "HEARTBEAT.md": `# HEARTBEAT.md

# keep this file empty (or with only comments) to skip heartbeat turns.
# add tasks below when you want the agent to check something periodically.

# example:
# - check for any new connections in the network
# - review recent memory entries and update if needed`,

  "TOOLS.md": `# TOOLS.md - local notes

_add setup-specific notes here: device names, account quirks, API notes, preferred workflows._

## tool usage guidelines
- use the search meta-tool to discover capabilities before saying you can't do something
- always try to execute the capability rather than describing what you would do
- when updating workspace files, write the full updated content, not just the diff
- the filesystem has 100 developer profiles - use fs_grep to search by skill`,
};

/**
 * All workspace file names in insertion order.
 */
export const WORKSPACE_FILE_NAMES = Object.keys(DEFAULT_WORKSPACE_FILES);

/**
 * Load all non-deleted workspace files for a tenant.
 */
export async function loadWorkspaceFiles(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<WorkspaceFile[]> {
  const { data, error } = await supabase
    .from("workspace_files")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_deleted", false)
    .order("file_name");

  if (error)
    throw new Error(`Failed to load workspace files: ${error.message}`);

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    tenantId: row.tenant_id as string,
    fileName: row.file_name as string,
    content: row.content as string,
    isDeleted: row.is_deleted as boolean,
    updatedAt: row.updated_at as string,
  }));
}

/**
 * Initialize default workspace files for a new tenant.
 * Uses upsert to avoid duplicates on re-initialization.
 */
export async function initializeWorkspaceFiles(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<void> {
  const rows = Object.entries(DEFAULT_WORKSPACE_FILES).map(
    ([fileName, content]) => ({
      tenant_id: tenantId,
      file_name: fileName,
      content,
      is_deleted: false,
    }),
  );

  const { error } = await supabase
    .from("workspace_files")
    .upsert(rows, { onConflict: "tenant_id,file_name" });

  if (error)
    throw new Error(`Failed to initialize workspace files: ${error.message}`);
}

/**
 * Update a single workspace file's content.
 */
export async function updateWorkspaceFile(
  supabase: SupabaseClient,
  tenantId: string,
  fileName: string,
  content: string,
): Promise<void> {
  const { error } = await supabase.from("workspace_files").upsert(
    {
      tenant_id: tenantId,
      file_name: fileName,
      content,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,file_name" },
  );

  if (error)
    throw new Error(`Failed to update workspace file: ${error.message}`);
}
