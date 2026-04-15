import { runEvals } from "./runner";

async function main() {
  console.log("running evals...\n");

  const run = await runEvals();

  console.log("\nresults:");
  for (const r of run.results) {
    const avg = r.avgScore.toFixed(1);
    console.log(`  ${r.scenarioKey}: ${avg}/10`);
  }
  console.log(`\naverage: ${run.avgScore.toFixed(1)}/10`);
  console.log(`\nrun id: ${run.id}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("eval failed:", err);
  process.exit(1);
});
