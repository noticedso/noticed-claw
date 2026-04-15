import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeveloperProfile } from "./types";

export type VirtualRoot = "/me" | "/developers" | "/connections" | "/repos";

export interface ParsedPath {
  root: VirtualRoot;
  subPath: string | null;
}

export function parsePath(path: string | undefined | null): ParsedPath {
  if (!path) return { root: "/" as VirtualRoot, subPath: null };
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

  // Root listing
  if (path === "/" || path === "" || !["me", "developers", "connections", "repos"].includes(root.replace("/", ""))) {
    return ["/me", "/developers", "/connections", "/repos"];
  }

  switch (root) {
    case "/me":
      return ["profile.md", "activity.md", "skills.md"];

    case "/developers": {
      const { data } = await supabase
        .from("developer_profiles")
        .select("login, name, skills")
        .order("name");
      return (data ?? []).map((d: { login: string; name: string; skills: string[] }) =>
        `${d.login}.md — ${d.name} (${(d.skills ?? []).slice(0, 3).join(", ")})`
      );
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
      // Try exact login match first
      let { data } = await supabase
        .from("developer_profiles")
        .select("*")
        .eq("login", name)
        .maybeSingle();

      // Fallback: search by name (case-insensitive)
      if (!data) {
        const { data: byName } = await supabase
          .from("developer_profiles")
          .select("*")
          .ilike("name", `%${name.replace(/[0-9]+$/, "").replace(/([a-z])([A-Z])/g, "$1 $2")}%`)
          .limit(1)
          .maybeSingle();
        data = byName;
      }

      // Fallback: fuzzy login match (strip .md, lowercase)
      if (!data) {
        const { data: fuzzy } = await supabase
          .from("developer_profiles")
          .select("*")
          .ilike("login", `%${name.toLowerCase().replace(/[^a-z0-9]/g, "")}%`)
          .limit(1)
          .maybeSingle();
        data = fuzzy;
      }

      if (!data) return `developer "${name}" not found. use fs_ls to see available profiles.`;
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
  const results: Array<{ path: string; matches: string[] }> = [];

  // 1. Semantic search via embeddings
  try {
    const { embed } = await import("ai");
    const { openai } = await import("@ai-sdk/openai");
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: pattern,
    });

    const { data: semanticResults } = await supabase.rpc("match_developer_profiles", {
      query_embedding: embedding,
      match_count: 20,
      min_score: 0.15,
    });

    if (semanticResults && semanticResults.length > 0) {
      for (const r of semanticResults) {
        const skills = (r.skills as string[]) ?? [];
        const similarity = Math.round((r.similarity as number) * 100);
        results.push({
          path: `/developers/${r.login}.md`,
          matches: [
            `${r.name} (${similarity}% match)`,
            `skills: ${skills.join(", ")}`,
            `bio: ${r.bio}`,
          ],
        });
      }
      return results;
    }
  } catch {
    // Fall through to keyword search if embedding fails
  }

  // 2. Fallback: keyword search (name, bio, skills)
  const lowerPattern = pattern.toLowerCase();
  const tokens = lowerPattern.split(/[\s\/,]+/).filter(Boolean);

  const { data } = await supabase
    .from("developer_profiles")
    .select("login, name, bio, skills");

  if (!data) return [];

  for (const profile of data) {
    const matches: string[] = [];
    const p = profile as { login: string; name: string; bio: string; skills: string[] };
    const haystack = `${p.name} ${p.bio} ${(p.skills ?? []).join(" ")}`.toLowerCase();

    // Match if ANY token appears in the profile
    const matchedTokens = tokens.filter((t) => haystack.includes(t));
    if (matchedTokens.length > 0) {
      if (p.skills?.some((s) => tokens.some((t) => s.toLowerCase().includes(t)))) {
        const matchingSkills = p.skills.filter((s) =>
          tokens.some((t) => s.toLowerCase().includes(t))
        );
        matches.push(`skills: ${matchingSkills.join(", ")}`);
      }
      if (tokens.some((t) => p.bio?.toLowerCase().includes(t))) {
        matches.push(`bio: ${p.bio}`);
      }
      if (tokens.some((t) => p.name?.toLowerCase().includes(t))) {
        matches.push(`name: ${p.name}`);
      }
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
