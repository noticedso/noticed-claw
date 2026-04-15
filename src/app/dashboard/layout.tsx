import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 p-4">
        <h1 className="mb-6 text-lg font-bold text-zinc-900">noticed-claw</h1>
        <nav className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="rounded px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
          >
            Overview
          </Link>
          <Link
            href="/dashboard/evals"
            className="rounded px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
          >
            Evals
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
