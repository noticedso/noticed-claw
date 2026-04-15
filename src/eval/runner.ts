import { createServerClient } from "@/supabase/client";
import { runAgentTurn } from "@/lib/agent/agent-turn";
import { judgeScenario } from "./judge";
import { loadScenarios } from "./scenarios";
import type { EvalRun, EvalResult, JudgeScores } from "./types";

export async function runEvals(): Promise<EvalRun> {
  const scenarios = loadScenarios();
  const supabase = createServerClient();
  const results: EvalResult[] = [];

  for (const scenario of scenarios) {
    console.log(`  running: ${scenario.key}...`);

    // Create ephemeral test tenant
    const tenantId = crypto.randomUUID();
    const { error: tenantErr } = await supabase.from("tenants").insert({
      id: tenantId,
      user_id: crypto.randomUUID(),
      name: `eval-${scenario.key}`,
      config: {
        model: "gpt-4o",
        persona: "donna",
        heartbeatEnabled: false,
        heartbeatIntervalMs: 3600000,
        activeHoursStart: 0,
        activeHoursEnd: 24,
        timezone: "UTC",
        toolPolicy: {},
      },
    });

    if (tenantErr) {
      console.error(`Failed to create eval tenant: ${tenantErr.message}`);
      continue;
    }

    const transcript: Array<{ role: string; content: string }> = [];
    const sessionKey = `tenant:${tenantId}:eval:dm:eval-runner`;

    try {
      // Play through scenario messages
      for (const msg of scenario.messages) {
        if (msg.role === "user") {
          transcript.push({ role: "user", content: msg.content });

          const result = await runAgentTurn({
            tenantId,
            sessionKey,
            userMessage: msg.content,
            platform: "eval",
            chatType: "dm",
            peerId: "eval-runner",
          });

          // Capture tool calls in transcript so judge can evaluate tool usage
          if (result.toolCalls && result.toolCalls.length > 0) {
            for (const tc of result.toolCalls) {
              transcript.push({
                role: "tool",
                content: `[called ${tc.name}(${JSON.stringify(tc.args).substring(0, 200)})]`,
              });
            }
          }
          if (result.content) {
            transcript.push({ role: "assistant", content: result.content });
          }
        }
      }

      // Judge the scenario
      const scores = await judgeScenario(scenario, transcript);
      const avgScore = calculateAvg(scores);

      results.push({
        scenarioKey: scenario.key,
        scores,
        transcript,
        judgeReasoning: scores.reasoning,
        avgScore,
      });
    } catch (err) {
      console.error(`Scenario ${scenario.key} failed:`, err);
      results.push({
        scenarioKey: scenario.key,
        scores: {
          coherence: 0,
          persona_adherence: 0,
          tool_usage: 0,
          brand_voice_compliance: 0,
          task_completion: 0,
          memory_quality: 0,
        },
        transcript,
        judgeReasoning: `error: ${err}`,
        avgScore: 0,
      });
    } finally {
      // Wait for post-turn hooks to settle before cleanup
      await new Promise((r) => setTimeout(r, 2000));

      // Cleanup: delete eval tenant data (order matters for FK constraints)
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("tenant_id", tenantId);
      const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);
      if (sessionIds.length > 0) {
        await supabase.from("messages").delete().in("session_id", sessionIds);
        await supabase.from("compaction_summaries").delete().in("session_id", sessionIds);
      }
      await supabase.from("session_summaries").delete().eq("tenant_id", tenantId);
      await supabase.from("sessions").delete().eq("tenant_id", tenantId);
      await supabase.from("workspace_files").delete().eq("tenant_id", tenantId);
      await supabase.from("memories").delete().eq("tenant_id", tenantId);
      await supabase.from("missions").delete().eq("tenant_id", tenantId);
      await supabase.from("cron_jobs").delete().eq("tenant_id", tenantId);
      await supabase.from("tenants").delete().eq("id", tenantId);
    }
  }

  // Store eval run
  const runAvg =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.avgScore, 0) / results.length
      : 0;

  const { data: run, error: runErr } = await supabase
    .from("eval_runs")
    .insert({
      scenario_count: results.length,
      avg_score: runAvg,
      metadata: {},
    })
    .select()
    .single();

  if (runErr) throw runErr;

  // Store individual results
  for (const result of results) {
    await supabase.from("eval_results").insert({
      run_id: run.id,
      scenario_key: result.scenarioKey,
      scores: result.scores,
      transcript: result.transcript,
      judge_reasoning: result.judgeReasoning,
    });
  }

  return {
    id: run.id,
    scenarioCount: results.length,
    avgScore: runAvg,
    results,
    createdAt: run.created_at,
  };
}

function calculateAvg(scores: JudgeScores): number {
  const values = [
    scores.coherence,
    scores.persona_adherence,
    scores.tool_usage,
    scores.brand_voice_compliance,
    scores.task_completion,
    scores.memory_quality,
  ];
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
