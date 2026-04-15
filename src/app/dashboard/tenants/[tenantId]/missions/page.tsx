import { getTenantMissions } from "@/lib/dashboard/queries";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  paused: "bg-yellow-100 text-yellow-800",
  abandoned: "bg-red-100 text-red-800",
};

interface Checkpoint {
  key: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export default async function MissionsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const missions = await getTenantMissions(tenantId);

  const missionItems = missions.filter(
    (m: Record<string, unknown>) => m.kind === "mission"
  );
  const goalItems = missions.filter(
    (m: Record<string, unknown>) => m.kind === "goal"
  );

  function renderMissionCard(m: Record<string, unknown>): React.ReactNode {
    const checkpoints = (m.checkpoints ?? []) as Checkpoint[];
    const completedCount = checkpoints.filter((c) => c.completed).length;
    const total = checkpoints.length;
    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return (
      <div
        key={m.id as string}
        className="rounded border border-zinc-200 bg-white p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <h4 className="font-semibold text-zinc-900">
            {String(m.title)}
          </h4>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[m.status as string] ?? "bg-zinc-100 text-zinc-600"}`}
          >
            {String(m.status)}
          </span>
          {m.mission_type ? (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
              {String(m.mission_type)}
            </span>
          ) : null}
        </div>
        <p className="mb-3 text-sm text-zinc-600">
          {String(m.objective)}
        </p>

        {total > 0 && (
          <>
            <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
              <span>
                {completedCount}/{total} checkpoints
              </span>
              <span>{pct}%</span>
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <details>
              <summary className="cursor-pointer text-xs font-medium text-zinc-500">
                Checkpoints
              </summary>
              <ul className="mt-2 space-y-1">
                {checkpoints.map((cp) => (
                  <li key={cp.key} className="flex items-start gap-2 text-sm">
                    <span
                      className={
                        cp.completed ? "text-green-600" : "text-zinc-400"
                      }
                    >
                      {cp.completed ? "[x]" : "[ ]"}
                    </span>
                    <span className="text-zinc-700">
                      {cp.description}
                      {cp.completedAt && (
                        <span className="ml-2 text-xs text-zinc-400">
                          {new Date(cp.completedAt).toLocaleString()}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}

        <p className="mt-2 text-xs text-zinc-400">
          Started {new Date(m.started_at as string).toLocaleString()}
          {m.completed_at
            ? ` | Completed ${new Date(m.completed_at as string).toLocaleString()}`
            : null}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-zinc-900">Missions</h3>
      {missionItems.length === 0 ? (
        <p className="mb-6 text-sm text-zinc-500">No missions found.</p>
      ) : (
        <div className="mb-8 space-y-4">
          {missionItems.map((m) => renderMissionCard(m))}
        </div>
      )}

      <h3 className="mb-3 text-lg font-semibold text-zinc-900">Goals</h3>
      {goalItems.length === 0 ? (
        <p className="text-sm text-zinc-500">No goals found.</p>
      ) : (
        <div className="space-y-4">{goalItems.map((m) => renderMissionCard(m))}</div>
      )}
    </div>
  );
}
