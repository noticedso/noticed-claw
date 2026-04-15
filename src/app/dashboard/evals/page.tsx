import { getEvalRuns } from "@/lib/dashboard/queries";
import Link from "next/link";

export default async function EvalsPage() {
  const runs = await getEvalRuns();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">eval runs</h2>

      {runs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">no eval runs yet</p>
          <p className="text-sm">run <code className="bg-gray-100 px-1 rounded">npm run eval</code> to start</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">run</th>
                <th className="text-left px-4 py-2 font-medium">scenarios</th>
                <th className="text-left px-4 py-2 font-medium">avg score</th>
                <th className="text-left px-4 py-2 font-medium">date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runs.map((run) => {
                const scoreColor =
                  run.avg_score >= 7
                    ? "text-green-600"
                    : run.avg_score >= 5
                      ? "text-yellow-600"
                      : "text-red-600";
                return (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/evals/${run.id}`}
                        className="text-blue-500 hover:underline font-mono text-xs"
                      >
                        {run.id.substring(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{run.scenario_count}</td>
                    <td className={`px-4 py-2 font-medium ${scoreColor}`}>
                      {run.avg_score?.toFixed(1)}/10
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
