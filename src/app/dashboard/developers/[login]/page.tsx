import Link from "next/link";
import { createServerClient } from "@/supabase/client";

export default async function DeveloperDetailPage({
  params,
}: {
  params: Promise<{ login: string }>;
}) {
  const { login } = await params;
  const supabase = createServerClient();

  const { data: profile } = await supabase
    .from("developer_profiles")
    .select("*")
    .eq("login", login)
    .single();

  if (!profile) {
    return <p className="text-sm text-zinc-500">developer not found</p>;
  }

  const skills = (profile.skills as string[]) ?? [];
  const repos = (profile.repos as Array<{ name: string; description: string; language: string; stars: number }>) ?? [];
  const connections = (profile.connections as string[]) ?? [];
  const activity = (profile.activity as { commitCount: number; languages: string[]; recentRepos: string[] }) ?? {
    commitCount: 0,
    languages: [],
    recentRepos: [],
  };

  // Resolve connection logins
  let connectionProfiles: Array<{ login: string; name: string }> = [];
  if (connections.length > 0) {
    const { data } = await supabase
      .from("developer_profiles")
      .select("login, name")
      .in("id", connections.slice(0, 20));
    connectionProfiles = (data ?? []) as Array<{ login: string; name: string }>;
  }

  const sortedRepos = [...repos].sort((a, b) => b.stars - a.stars);

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/developers"
        className="text-sm text-zinc-500 hover:text-zinc-700 mb-4 inline-block"
      >
        &larr; all developers
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900">{profile.name}</h2>
        <p className="text-sm text-zinc-500">@{profile.login}</p>
        <p className="text-sm text-zinc-600 mt-2">{profile.bio}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-zinc-200 rounded-lg p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">commits</p>
          <p className="text-2xl font-bold text-zinc-900">{activity.commitCount.toLocaleString()}</p>
        </div>
        <div className="border border-zinc-200 rounded-lg p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">repos</p>
          <p className="text-2xl font-bold text-zinc-900">{repos.length}</p>
        </div>
        <div className="border border-zinc-200 rounded-lg p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">connections</p>
          <p className="text-2xl font-bold text-zinc-900">{connections.length}</p>
        </div>
      </div>

      {/* Skills */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-2">skills</h3>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <Link
              key={s}
              href={`/dashboard/developers?skill=${encodeURIComponent(s)}`}
              className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded text-xs hover:bg-zinc-200"
            >
              {s}
            </Link>
          ))}
        </div>
      </section>

      {/* Languages */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-2">languages</h3>
        <div className="flex flex-wrap gap-1.5">
          {activity.languages.map((l) => (
            <span key={l} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* Repos */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-700 mb-2">
          repos ({repos.length})
        </h3>
        <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-200">
          {sortedRepos.map((r) => (
            <div key={r.name} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-zinc-900">{r.name}</span>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{r.language}</span>
                  <span>{r.stars} stars</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{r.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Connections */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-700 mb-2">
          connections ({connections.length})
        </h3>
        {connectionProfiles.length === 0 ? (
          <p className="text-sm text-zinc-500">no connections</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {connectionProfiles.map((c) => (
              <Link
                key={c.login}
                href={`/dashboard/developers/${c.login}`}
                className="border border-zinc-200 rounded px-3 py-1.5 text-sm hover:border-zinc-400"
              >
                <span className="text-zinc-900">{c.name}</span>
                <span className="text-zinc-400 ml-1">@{c.login}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
