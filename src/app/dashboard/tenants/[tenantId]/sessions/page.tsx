import Link from "next/link";
import { getTenantSessions } from "@/lib/dashboard/queries";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const sessions = await getTenantSessions(tenantId);

  if (sessions.length === 0) {
    return <p className="text-sm text-zinc-500">No sessions found.</p>;
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold text-zinc-900">Sessions</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
            <th className="py-2 pr-4">Session Key</th>
            <th className="py-2 pr-4">Channel</th>
            <th className="py-2 pr-4">Chat Type</th>
            <th className="py-2 pr-4">Tokens</th>
            <th className="py-2 pr-4">Compactions</th>
            <th className="py-2 pr-4">Updated</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {sessions.map((s: Record<string, unknown>) => (
            <tr
              key={s.id as string}
              className="border-b border-zinc-100 hover:bg-zinc-50"
            >
              <td className="py-2 pr-4 font-mono text-xs text-zinc-900">
                {s.session_key as string}
              </td>
              <td className="py-2 pr-4 text-zinc-600">
                {s.channel as string}
              </td>
              <td className="py-2 pr-4 text-zinc-600">
                {s.chat_type as string}
              </td>
              <td className="py-2 pr-4 text-zinc-600">
                {(s.total_tokens as number).toLocaleString()}
              </td>
              <td className="py-2 pr-4 text-zinc-600">
                {s.compaction_count as number}
              </td>
              <td className="py-2 pr-4 text-zinc-500">
                {new Date(s.updated_at as string).toLocaleString()}
              </td>
              <td className="py-2">
                <Link
                  href={`/dashboard/tenants/${tenantId}/messages?session=${s.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Messages
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
