import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeveloperProfile } from "./types";

export type VirtualRoot = "/me" | "/developers" | "/connections" | "/repos";

export interface ParsedPath {
  root: VirtualRoot;
  subPath: string | null;
}

export function parsePath(path: string): ParsedPath {
  const cleaned = path.startsWith("/") ? path : `/${path}`;
  const parts = cleaned.split("/").filter(Boolean);
  const root = `/${parts[0]}` as VirtualRoot;
  const subPath = parts.length > 1 ? parts.slice(1).join("/") : null;
  return { root, subPath };
}

export async function fsLs(
  supabase: SupabaseClient,
  tenantId: string,
  path: string
): Promise<string[]> {
  const { root, subPath } = parsePath(path);

  if (subPath) return []; // No nested directories

  switch (root) {
    case "/me":
      return ["profile.md", "activity.md", "skills.md"];

    case "/developers": {
      const { data } = await supabase
        .from("developer_profiles")
        .select("login")
        .order("login");
      return (data ?? []).map((d: { login: string }) => `${d.login}.md`);
    }

    case "/connections": {
      // Get current user's developer profile connections
      const { data: tenant } = await supabase
        .from("tenants")
        .select("user_id")
        .eq("id", tenantId)
        .single();
      if (!tenant) return [];

      // Find connections for this user (use first profile as "me" for demo)
      const { data: profiles } = await supabase
        .from("developer_profiles")
        .select("login")
        .limit(20);
      return (profiles ?? []).map((d: { login: string }) => `${d.login}.md`);
    }

    case "/repos": {
      const { data } = await supabase
        .from("developer_profiles")
        .select("repos");
      const repoNames = new Set<string>();
      for (const profile of data ?? []) {
        const repos = profile.repos as Array<{ name: string }>;
        for (const repo of repos ?? []) {
          repoNames.add(`${repo.name}.md`);
        }
      }
      return Array.from(repoNames).sort().slice(0, 100);
    }

    default:
      return [];
  }
}

export async function fsRead(
  supabase: SupabaseClient,
  tenantId: string,
  path: string
): Promise<string> {
  const { root, subPath } = parsePath(path);

  if (!subPath) {
    const entries = await fsLs(supabase, tenantId, path);
    return entries.join("\n");
  }

  const name = subPath.replace(/\.md$/, "");

  switch (root) {
    case "/me": {
      // Return first profile as "me" for demo
      const { data } = await supabase
        .from("developer_profiles")
        .select("*")
        .limit(1)
        .single();
      if (!data) return "no profile found";
      return formatProfile(data as unknown as DeveloperProfile, subPath);
    }

    case "/developers": {
      const { data } = await supabase
        .from("developer_profiles")
        .select("*")
        .eq("login", name)
        .single();
      if (!data) return `developer "${name}" not found`;
      return formatFullProfile(data);
    }

    case "/connections": {
      const { data } = await supabase
        .from("developer_profiles")
        .select("*")
        .eq("login", name)
        .single();
      if (!data) return `connection "${name}" not found`;
      return formatFullProfile(data);
    }

    case "/repos": {
      const { data } = await supabase
        .from("developer_profiles")
        .select("login, repos")
        .not("repos", "is", null);
      if (!data) return `repo "${name}" not found`;

      const contributors: string[] = [];
      for (const profile of data) {
        const repos = profile.repos as Array<{ name: string; description: string; language: string; stars: number }>;
        const match = repos?.find((r) => r.name === name);
        if (match) {
          contributors.push(profile.login);
        }
      }
      if (contributors.length === 0) return `repo "${name}" not found`;

      return `# ${name}\n\n## contributors\n${contributors.map((c) => `- ${c}`).join("\n")}`;
    }

    default:
      return "unknown path";
  }
}

export async function fsGrep(
  supabase: SupabaseClient,
  _tenantId: string,
  pattern: string
): Promise<Array<{ path: string; matches: string[] }>> {
  const lowerPattern = pattern.toLowerCase();

  // Search by name, bio, and skills
  const { data } = await supabase
    .from("developer_profiles")
    .select("login, name, bio, skills");

  if (!data) return [];

  const results: Array<{ path: string; matches: string[] }> = [];

  for (const profile of data) {
    const matches: string[] = [];
    const p = profile as { login: string; name: string; bio: string; skills: string[] };

    if (p.name?.toLowerCase().includes(lowerPattern)) {
      matches.push(`name: ${p.name}`);
    }
    if (p.bio?.toLowerCase().includes(lowerPattern)) {
      matches.push(`bio: ${p.bio}`);
    }
    if (p.skills?.some((s: string) => s.toLowerCase().includes(lowerPattern))) {
      const matchingSkills = p.skills.filter((s: string) =>
        s.toLowerCase().includes(lowerPattern)
      );
      matches.push(`skills: ${matchingSkills.join(", ")}`);
    }

    if (matches.length > 0) {
      results.push({ path: `/developers/${p.login}.md`, matches });
    }
  }

  return results;
}

function formatProfile(profile: DeveloperProfile, subPath: string): string {
  switch (subPath) {
    case "profile.md":
      return `# ${profile.name}\n\n@${profile.login}\n\n${profile.bio}`;
    case "activity.md":
      return `# activity\n\ncommits: ${profile.activity.commitCount}\nlanguages: ${profile.activity.languages.join(", ")}\nrecent repos: ${profile.activity.recentRepos.join(", ")}`;
    case "skills.md":
      return `# skills\n\n${profile.skills.map((s) => `- ${s}`).join("\n")}`;
    default:
      return "unknown file";
  }
}

function formatFullProfile(row: Record<string, unknown>): string {
  const p = row as unknown as {
    login: string;
    name: string;
    bio: string;
    skills: string[];
    repos: Array<{ name: string; description: string; language: string; stars: number }>;
    activity: { commitCount: number; languages: string[]; recentRepos: string[] };
  };

  const repoList = (p.repos ?? [])
    .map((r) => `- ${r.name} (${r.language}, ${r.stars} stars): ${r.description}`)
    .join("\n");

  return `# ${p.name}\n\n@${p.login}\n\n${p.bio}\n\n## skills\n${(p.skills ?? []).map((s) => `- ${s}`).join("\n")}\n\n## repos\n${repoList}\n\n## activity\ncommits: ${p.activity?.commitCount ?? 0}\nlanguages: ${(p.activity?.languages ?? []).join(", ")}`;
}
