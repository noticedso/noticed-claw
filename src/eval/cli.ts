import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { runEvals } from "./runner";
import type { EvalRun } from "./types";

function writeCSV(run: EvalRun, outputDir: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `eval-${timestamp}.csv`;
  const filepath = join(outputDir, filename);

  const dimensions = [
    "coherence",
    "persona_adherence",
    "tool_usage",
    "brand_voice_compliance",
    "task_completion",
    "memory_quality",
  ];

  const header = ["scenario", ...dimensions, "avg", "reasoning"].join(",");
  const rows = run.results.map((r) => {
    const scores = r.scores as unknown as Record<string, number>;
    const dimValues = dimensions.map((d) => scores[d]?.toFixed(1) ?? "0.0");
    // Escape reasoning for CSV (double-quote any quotes, wrap in quotes)
    const reasoning = `"${(r.judgeReasoning ?? "").replace(/"/g, '""')}"`;
    return [r.scenarioKey, ...dimValues, r.avgScore.toFixed(1), reasoning].join(",");
  });

  // Summary row
  const avgRow = [
    "AVERAGE",
    ...dimensions.map(() => ""),
    run.avgScore.toFixed(1),
    "",
  ].join(",");

  const csv = [header, ...rows, avgRow].join("\n");
  writeFileSync(filepath, csv);
  return filepath;
}

async function main() {
  console.log("running evals...\n");

  const run = await runEvals();

  console.log("\nresults:");
  for (const r of run.results) {
    const avg = r.avgScore.toFixed(1);
    const scores = r.scores as unknown as Record<string, number>;
    const tool = scores.tool_usage?.toFixed(0) ?? "?";
    const task = scores.task_completion?.toFixed(0) ?? "?";
    console.log(`  ${r.scenarioKey}: ${avg}/10 (tool:${tool} task:${task})`);
  }
  console.log(`\naverage: ${run.avgScore.toFixed(1)}/10`);
  console.log(`run id: ${run.id}`);

  // Write CSV
  const outputDir = join(__dirname, "../../eval-results");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  const csvPath = writeCSV(run, outputDir);
  console.log(`\ncsv: ${csvPath}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("eval failed:", err);
  process.exit(1);
});
