import Link from "next/link";
import { getTenantMessages, getTenantSessions } from "@/lib/dashboard/queries";

const roleBadgeClasses: Record<string, string> = {
  user: "bg-blue-100 text-blue-800",
  assistant: "bg-zinc-200 text-zinc-800",
  system: "bg-yellow-100 text-yellow-800",
  tool: "bg-green-100 text-green-800",
};

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { tenantId } = await params;
  const { session: sessionId } = await searchParams;

  if (!sessionId) {
    const sessions = await getTenantSessions(tenantId);
    return (
      <div>
        <h3 className="mb-3 text-lg font-semibold text-zinc-900">Messages</h3>
        <p className="mb-3 text-sm text-zinc-500">
          Select a session to view messages:
        </p>
        <ul className="space-y-1">
          {sessions.map((s: Record<string, unknown>) => (
            <li key={s.id as string}>
              <Link
                href={`/dashboard/tenants/${tenantId}/messages?session=${s.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {s.session_key as string}{" "}
                <span className="text-zinc-400">
                  ({s.channel as string})
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const messages = await getTenantMessages(sessionId);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-lg font-semibold text-zinc-900">Messages</h3>
        <Link
          href={`/dashboard/tenants/${tenantId}/messages`}
          className="text-sm text-blue-600 hover:underline"
        >
          Change session
        </Link>
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-zinc-500">No messages in this session.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m: Record<string, unknown>) => {
            const role = m.role as string;
            const toolCalls = m.tool_calls as unknown[] | null;
            return (
              <div
                key={m.id as string}
                className="rounded border border-zinc-200 bg-white p-3"
              >
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-medium ${roleBadgeClasses[role] ?? "bg-zinc-100 text-zinc-600"}`}
                  >
                    {role}
                  </span>
                  <span className="text-zinc-400">
                    {new Date(m.created_at as string).toLocaleString()}
                  </span>
                  {(m.token_count as number) > 0 && (
                    <span className="text-zinc-400">
                      {m.token_count as number} tokens
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm text-zinc-800">
                  {m.content as string}
                </p>
                {toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500">
                      Tool calls ({toolCalls.length})
                    </summary>
                    <pre className="mt-1 max-h-60 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-700">
                      {JSON.stringify(toolCalls, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
