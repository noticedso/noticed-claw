import Link from "next/link";
import { createServerClient } from "@/supabase/client";

export default async function DevelopersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; skill?: string }>;
}) {
  const { q, skill } = await searchParams;
  const supabase = createServerClient();

  // Get all unique skills for the filter
  const { data: allProfiles } = await supabase
    .from("developer_profiles")
    .select("skills");

  const allSkills = new Set<string>();
  for (const p of allProfiles ?? []) {
    for (const s of (p.skills as string[]) ?? []) {
      allSkills.add(s);
    }
  }
  const sortedSkills = [...allSkills].sort();

  // Build filtered query
  let query = supabase
    .from("developer_profiles")
    .select("id, login, name, bio, skills, repos, activity")
    .order("name");

  if (q) {
    query = query.or(`name.ilike.%${q}%,login.ilike.%${q}%,bio.ilike.%${q}%`);
  }
  if (skill) {
    query = query.contains("skills", [skill]);
  }

  const { data: profiles } = await query.limit(100);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        developers
        <span className="ml-2 text-sm font-normal text-zinc-500">
          {profiles?.length ?? 0} profiles
        </span>
      </h2>

      {/* Filters */}
      <form className="flex gap-3 mb-6">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="search name, login, or bio..."
          className="border border-zinc-300 rounded px-3 py-1.5 text-sm w-64 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="skill"
          defaultValue={skill ?? ""}
          className="border border-zinc-300 rounded px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">all skills</option>
          {sortedSkills.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-zinc-900 text-white rounded px-4 py-1.5 text-sm hover:bg-zinc-800"
        >
          filter
        </button>
        {(q || skill) && (
          <Link
            href="/dashboard/developers"
            className="text-sm text-zinc-500 hover:text-zinc-700 self-center"
          >
            clear
          </Link>
        )}
      </form>

      {/* Profiles grid */}
      {!profiles || profiles.length === 0 ? (
        <p className="text-sm text-zinc-500">no developers found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => {
            const skills = (p.skills as string[]) ?? [];
            const repos = (p.repos as Array<{ name: string; language: string; stars: number }>) ?? [];
            const activity = (p.activity as { commitCount: number; languages: string[] }) ?? { commitCount: 0, languages: [] };
            const topRepos = repos.sort((a, b) => b.stars - a.stars).slice(0, 3);

            return (
              <Link
                key={p.id}
                href={`/dashboard/developers/${p.login}`}
                className="border border-zinc-200 rounded-lg p-4 hover:border-zinc-400 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-zinc-900">{p.name}</h3>
                    <p className="text-xs text-zinc-500">@{p.login}</p>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {activity.commitCount.toLocaleString()} commits
                  </span>
                </div>

                <p className="text-xs text-zinc-600 mb-3 line-clamp-2">{p.bio}</p>

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {skills.slice(0, 5).map((s) => (
                    <span
                      key={s}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        s === skill
                          ? "bg-blue-100 text-blue-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                  {skills.length > 5 && (
                    <span className="text-xs text-zinc-400">+{skills.length - 5}</span>
                  )}
                </div>

                {/* Top repos */}
                {topRepos.length > 0 && (
                  <div className="space-y-1">
                    {topRepos.map((r) => (
                      <div key={r.name} className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-700 truncate">{r.name}</span>
                        <span className="text-zinc-400">{r.language}</span>
                        <span className="text-zinc-400 ml-auto">{r.stars} stars</span>
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
