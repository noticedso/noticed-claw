import Link from "next/link";
import { getTenantWorkspaceFiles } from "@/lib/dashboard/queries";

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ file?: string }>;
}) {
  const { tenantId } = await params;
  const { file: selectedFileId } = await searchParams;
  const files = await getTenantWorkspaceFiles(tenantId);

  if (files.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-lg font-semibold text-zinc-900">Workspace</h3>
        <p className="text-sm text-zinc-500">No workspace files found.</p>
      </div>
    );
  }

  const activeFile = selectedFileId
    ? files.find((f: Record<string, unknown>) => f.id === selectedFileId)
    : files[0];

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-zinc-900">Workspace</h3>

      <div className="mb-4 flex gap-1 border-b border-zinc-200">
        {files.map((f: Record<string, unknown>) => {
          const isActive =
            (activeFile as Record<string, unknown> | undefined)?.id === f.id;
          return (
            <Link
              key={f.id as string}
              href={`/dashboard/tenants/${tenantId}/workspace?file=${f.id}`}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                isActive
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
              }`}
            >
              {f.file_name as string}
            </Link>
          );
        })}
      </div>

      {activeFile ? (
        <div>
          <div className="mb-2 text-xs text-zinc-400">
            Updated:{" "}
            {new Date(
              (activeFile as Record<string, unknown>).updated_at as string
            ).toLocaleString()}
          </div>
          <pre className="max-h-[600px] overflow-auto rounded border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
            {(activeFile as Record<string, unknown>).content as string}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">File not found.</p>
      )}
    </div>
  );
}
