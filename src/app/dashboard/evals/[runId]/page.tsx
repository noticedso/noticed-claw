import { getEvalRunDetail } from "@/lib/dashboard/queries";

export default async function EvalDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const { run, results } = await getEvalRunDetail(runId);

  if (!run) {
    return <p className="text-gray-500">eval run not found</p>;
  }

  const dimensions = [
    "coherence",
    "persona_adherence",
    "tool_usage",
    "brand_voice_compliance",
    "task_completion",
    "memory_quality",
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">
          eval run <span className="font-mono text-sm">{run.id.substring(0, 8)}</span>
        </h2>
        <div className="text-sm text-gray-500">
          {run.scenario_count} scenarios | avg{" "}
          <span className="font-medium">{run.avg_score?.toFixed(1)}/10</span> |{" "}
          {new Date(run.created_at).toLocaleString()}
        </div>
      </div>

      <div className="space-y-6">
        {results.map((result) => {
          const scores = result.scores as Record<string, number>;
          const avg =
            dimensions.reduce((sum, d) => sum + (scores[d] ?? 0), 0) /
            dimensions.length;
          const avgColor =
            avg >= 7
              ? "text-green-600"
              : avg >= 5
                ? "text-yellow-600"
                : "text-red-600";

          return (
            <div
              key={result.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="font-medium text-sm">{result.scenario_key}</span>
                <span className={`font-medium ${avgColor}`}>
                  {avg.toFixed(1)}/10
                </span>
              </div>

              <div className="p-4">
                {/* Score bars */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {dimensions.map((dim) => {
                    const score = scores[dim] ?? 0;
                    const color =
                      score >= 7
                        ? "bg-green-500"
                        : score >= 5
                          ? "bg-yellow-500"
                          : "bg-red-500";
                    return (
                      <div key={dim}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">
                            {dim.replace(/_/g, " ")}
                          </span>
                          <span>{score}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded">
                          <div
                            className={`h-2 rounded ${color}`}
                            style={{ width: `${score * 10}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Judge reasoning */}
                <details className="mb-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    judge reasoning
                  </summary>
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {result.judge_reasoning}
                  </p>
                </details>

                {/* Transcript */}
                <details>
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    transcript
                  </summary>
                  <div className="mt-2 space-y-2">
                    {(
                      result.transcript as Array<{
                        role: string;
                        content: string;
                      }>
                    )?.map((msg, i) => (
                      <div
                        key={i}
                        className={`text-sm p-2 rounded ${
                          msg.role === "user"
                            ? "bg-blue-50"
                            : "bg-gray-50"
                        }`}
                      >
                        <span className="text-xs font-medium text-gray-500">
                          {msg.role}:
                        </span>{" "}
                        {msg.content}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
