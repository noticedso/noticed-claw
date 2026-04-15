import Link from "next/link";
import { getDashboardStats, getAllTenants } from "@/lib/dashboard/queries";

export default async function DashboardOverviewPage() {
  const [stats, tenants] = await Promise.all([
    getDashboardStats(),
    getAllTenants(),
  ]);

  const cards = [
    { label: "Tenants", value: stats.tenantCount },
    { label: "Active Sessions (24h)", value: stats.activeSessionCount },
    { label: "Total Messages", value: stats.messageCount },
    { label: "Memories", value: stats.memoryCount },
    {
      label: "Last Eval Score",
      value:
        stats.lastEvalScore !== null
          ? stats.lastEvalScore.toFixed(2)
          : "N/A",
    },
  ];

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-zinc-900">Overview</h2>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase text-zinc-500">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 text-lg font-semibold text-zinc-900">Tenants</h3>
      {tenants.length === 0 ? (
        <p className="text-sm text-zinc-500">No tenants found.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Model</th>
              <th className="py-2 pr-4">Persona</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {tenants.map((t: Record<string, unknown>) => {
              const config = (t.config ?? {}) as Record<string, unknown>;
              return (
                <tr
                  key={t.id as string}
                  className="border-b border-zinc-100 hover:bg-zinc-50"
                >
                  <td className="py-2 pr-4 font-medium text-zinc-900">
                    {t.name as string}
                  </td>
                  <td className="py-2 pr-4 text-zinc-500 text-xs">
                    {(t.user_email as string) ?? "-"}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {(config.model as string) ?? "-"}
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">
                    {(config.persona as string) ?? "-"}
                  </td>
                  <td className="py-2 pr-4 text-zinc-500">
                    {new Date(t.created_at as string).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/dashboard/tenants/${t.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
