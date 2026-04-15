import { getTenantCronJobs } from "@/lib/dashboard/queries";

const scheduleKindColors: Record<string, string> = {
  at: "bg-blue-100 text-blue-800",
  every: "bg-purple-100 text-purple-800",
  cron: "bg-zinc-200 text-zinc-800",
};

export default async function CronPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const jobs = await getTenantCronJobs(tenantId);

  if (jobs.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-lg font-semibold text-zinc-900">Cron Jobs</h3>
        <p className="text-sm text-zinc-500">No cron jobs found.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-zinc-900">Cron Jobs</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Kind</th>
            <th className="py-2 pr-4">Schedule</th>
            <th className="py-2 pr-4">Next Run</th>
            <th className="py-2 pr-4">Last Run</th>
            <th className="py-2 pr-4">Runs</th>
            <th className="py-2">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j: Record<string, unknown>) => (
            <tr
              key={j.id as string}
              className="border-b border-zinc-100 hover:bg-zinc-50"
            >
              <td className="py-2 pr-4 font-medium text-zinc-900">
                {j.name as string}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${scheduleKindColors[j.schedule_kind as string] ?? "bg-zinc-100 text-zinc-600"}`}
                >
                  {j.schedule_kind as string}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-zinc-600">
                {j.schedule_value as string}
              </td>
              <td className="py-2 pr-4 text-zinc-500">
                {j.next_run_at
                  ? new Date(j.next_run_at as string).toLocaleString()
                  : "-"}
              </td>
              <td className="py-2 pr-4 text-zinc-500">
                {j.last_run_at
                  ? new Date(j.last_run_at as string).toLocaleString()
                  : "-"}
              </td>
              <td className="py-2 pr-4 text-zinc-600">
                {j.run_count as number}
              </td>
              <td className="py-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${j.enabled ? "bg-green-500" : "bg-zinc-300"}`}
                  title={j.enabled ? "Enabled" : "Disabled"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
