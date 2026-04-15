import { getTenantById } from "@/lib/dashboard/queries";
import { CAPABILITIES } from "@/lib/agent/tools/capability-registry";

export default async function ToolsPage({
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
  const allowList = (toolPolicy.allow as string[] | undefined) ?? [];
  const denyList = (toolPolicy.deny as string[] | undefined) ?? [];

  const categories = Array.from(
    new Set(CAPABILITIES.map((c) => c.category))
  ).sort();

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-zinc-900">
        Tool Policy
      </h3>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded border border-zinc-200 bg-white p-4">
          <h4 className="mb-2 text-sm font-semibold text-zinc-700">Allow</h4>
          {allowList.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No explicit allow list (all allowed)
            </p>
          ) : (
            <ul className="space-y-1">
              {allowList.map((tool) => (
                <li
                  key={tool}
                  className="rounded bg-green-50 px-2 py-1 text-sm text-green-800"
                >
                  {tool}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded border border-zinc-200 bg-white p-4">
          <h4 className="mb-2 text-sm font-semibold text-zinc-700">Deny</h4>
          {denyList.length === 0 ? (
            <p className="text-sm text-zinc-500">No denied tools</p>
          ) : (
            <ul className="space-y-1">
              {denyList.map((tool) => (
                <li
                  key={tool}
                  className="rounded bg-red-50 px-2 py-1 text-sm text-red-800"
                >
                  {tool}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h3 className="mb-3 text-lg font-semibold text-zinc-900">
        Capability Browser
      </h3>

      {categories.map((category) => {
        const caps = CAPABILITIES.filter((c) => c.category === category);
        return (
          <div key={category} className="mb-4">
            <h4 className="mb-2 text-sm font-semibold uppercase text-zinc-500">
              {category}
            </h4>
            <div className="space-y-2">
              {caps.map((cap) => {
                const isDenied = denyList.includes(cap.name);
                return (
                  <div
                    key={cap.name}
                    className={`rounded border p-3 ${isDenied ? "border-red-200 bg-red-50" : "border-zinc-200 bg-white"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-zinc-900">
                        {cap.name}
                      </span>
                      {isDenied && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                          denied
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">
                      {cap.description}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(cap.parameters).map(([key, val]) => (
                        <span
                          key={key}
                          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600"
                        >
                          {key}:{" "}
                          {(val as Record<string, string>).type ?? "unknown"}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
