import {
  getTenantById,
  getTenantSessions,
  getTenantMemories,
} from "@/lib/dashboard/queries";
import { createServerClient } from "@/supabase/client";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    return <p className="text-sm text-red-600">Tenant not found.</p>;
  }

  const config = (tenant.config ?? {}) as Record<string, unknown>;
  const toolPolicy = (config.toolPolicy ?? {}) as Record<string, unknown>;

  const [sessions, memories, messageCount] = await Promise.all([
    getTenantSessions(tenantId),
    getTenantMemories(tenantId),
    createServerClient()
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in(
        "session_id",
        (await getTenantSessions(tenantId)).map(
          (s: Record<string, unknown>) => s.id as string
        )
      )
      .then((r) => r.count ?? 0),
  ]);

  const fields = [
    { label: "ID", value: tenant.id },
    { label: "Name", value: tenant.name },
    { label: "Model", value: config.model as string },
    { label: "Persona", value: config.persona as string },
    {
      label: "Heartbeat",
      value: config.heartbeatEnabled
        ? `Enabled (every ${Math.round((config.heartbeatIntervalMs as number) / 60000)}m)`
        : "Disabled",
    },
    { label: "Timezone", value: config.timezone as string },
    {
      label: "Active Hours",
      value: `${config.activeHoursStart}:00 - ${config.activeHoursEnd}:00`,
    },
    {
      label: "Tool Policy Allow",
      value:
        (toolPolicy.allow as string[] | undefined)?.join(", ") || "all",
    },
    {
      label: "Tool Policy Deny",
      value:
        (toolPolicy.deny as string[] | undefined)?.join(", ") || "none",
    },
    {
      label: "Created",
      value: new Date(tenant.created_at as string).toLocaleString(),
    },
  ];

  const stats = [
    { label: "Sessions", value: sessions.length },
    { label: "Messages", value: messageCount },
    { label: "Memories", value: memories.length },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase text-zinc-500">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 text-lg font-semibold text-zinc-900">
        Configuration
      </h3>
      <table className="w-full max-w-xl text-sm">
        <tbody>
          {fields.map((f) => (
            <tr key={f.label} className="border-b border-zinc-100">
              <td className="py-2 pr-4 font-medium text-zinc-600">
                {f.label}
              </td>
              <td className="py-2 text-zinc-900">{f.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
