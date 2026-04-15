"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "overview" },
  { href: "/dashboard/chat", label: "chat" },
  { href: "/dashboard/developers", label: "developers" },
  { href: "/dashboard/evals", label: "evals" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 flex flex-col">
        <div className="p-4">
          <h1 className="mb-6 text-lg font-bold text-zinc-900">noticed-claw</h1>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-zinc-200 text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-zinc-200">
          {userEmail && (
            <p className="text-xs text-zinc-500 truncate mb-2" title={userEmail}>
              {userEmail}
            </p>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-zinc-500 hover:text-zinc-700"
          >
            sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
