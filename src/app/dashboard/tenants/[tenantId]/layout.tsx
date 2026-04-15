import Link from "next/link";
import { getTenantById } from "@/lib/dashboard/queries";

const tabs = [
  { label: "Overview", href: "" },
  { label: "Sessions", href: "/sessions" },
  { label: "Messages", href: "/messages" },
  { label: "Memories", href: "/memories" },
  { label: "Missions", href: "/missions" },
  { label: "Workspace", href: "/workspace" },
  { label: "Cron", href: "/cron" },
  { label: "Tools", href: "/tools" },
];

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Dashboard
        </Link>
        <h2 className="text-xl font-semibold text-zinc-900">
          {(tenant?.name as string) ?? "Tenant"}
        </h2>
      </div>

      <nav className="mb-6 flex gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={`/dashboard/tenants/${tenantId}${tab.href}`}
            className="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
