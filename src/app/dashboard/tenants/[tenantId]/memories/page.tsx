import { getTenantMemories } from "@/lib/dashboard/queries";

const categoryColors: Record<string, string> = {
  preference: "bg-purple-100 text-purple-800",
  decision: "bg-blue-100 text-blue-800",
  fact: "bg-zinc-200 text-zinc-800",
  commitment: "bg-orange-100 text-orange-800",
  milestone: "bg-green-100 text-green-800",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  superseded: "bg-yellow-100 text-yellow-800",
  archived: "bg-zinc-200 text-zinc-600",
};

export default async function MemoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const { tenantId } = await params;
  const filters = await searchParams;
  const memories = await getTenantMemories(tenantId, filters);

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-zinc-900">Memories</h3>

      <form className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Search
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="keyword..."
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Category
          <select
            name="category"
            defaultValue={filters.category ?? ""}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="preference">preference</option>
            <option value="decision">decision</option>
            <option value="fact">fact</option>
            <option value="commitment">commitment</option>
            <option value="milestone">milestone</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Status
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="active">active</option>
            <option value="superseded">superseded</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
          Type
          <select
            name="type"
            defaultValue={filters.type ?? ""}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">All</option>
            <option value="daily">daily</option>
            <option value="curated">curated</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Filter
        </button>
      </form>

      {memories.length === 0 ? (
        <p className="text-sm text-zinc-500">No memories found.</p>
      ) : (
        <div className="space-y-3">
          {memories.map((m: Record<string, unknown>) => (
            <div
              key={m.id as string}
              className="rounded border border-zinc-200 bg-white p-3"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${categoryColors[m.category as string] ?? "bg-zinc-100 text-zinc-600"}`}
                >
                  {m.category as string}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${statusColors[m.status as string] ?? "bg-zinc-100 text-zinc-600"}`}
                >
                  {m.status as string}
                </span>
                <span className="text-zinc-400">
                  {m.memory_type as string}
                </span>
                <span className="text-zinc-400">
                  confidence: {((m.confidence as number) * 100).toFixed(0)}%
                </span>
                <span className="text-zinc-400">
                  {new Date(m.created_at as string).toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-zinc-800">
                {m.content as string}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
