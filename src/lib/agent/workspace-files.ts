// src/lib/agent/workspace-files.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceFile } from "./types";

/**
 * Default workspace file contents. These are initialized for each new tenant
 * and can be customized via the workspace_write tool.
 */
export const DEFAULT_WORKSPACE_FILES: Record<string, string> = {
  "AGENTS.md":
    "# agent rules\n\n- respond naturally\n- follow brand voice\n- never break character",
  "SOUL.md": "# personality\n\nbe helpful and genuine",
  "USER.md": "# user context\n\nno user info yet",
  "IDENTITY.md":
    "# identity\n\nname: claw\nrole: developer intelligence agent",
  "BOOTSTRAP.md":
    "# onboarding\n\nwelcome new users, help them set up their persona",
  "HEARTBEAT.md":
    "# heartbeat behavior\n\ncheck in periodically, be helpful not annoying",
  "TOOLS.md":
    "# tool guidelines\n\nuse tools when needed, explain what you found",
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
  tenantId: string
): Promise<WorkspaceFile[]> {
  const { data, error } = await supabase
    .from("workspace_files")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_deleted", false)
    .order("file_name");

  if (error) throw new Error(`Failed to load workspace files: ${error.message}`);

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
  tenantId: string
): Promise<void> {
  const rows = Object.entries(DEFAULT_WORKSPACE_FILES).map(
    ([fileName, content]) => ({
      tenant_id: tenantId,
      file_name: fileName,
      content,
      is_deleted: false,
    })
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
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("workspace_files")
    .upsert(
      {
        tenant_id: tenantId,
        file_name: fileName,
        content,
        is_deleted: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,file_name" }
    );

  if (error)
    throw new Error(`Failed to update workspace file: ${error.message}`);
}
