import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { EvalScenario, JudgeScores } from "./types";

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator for AI agent responses.
Score the agent's response on 6 dimensions from 0-10.
Return a JSON object with this exact structure:
{
  "coherence": <0-10>,
  "persona_adherence": <0-10>,
  "tool_usage": <0-10>,
  "brand_voice_compliance": <0-10>,
  "task_completion": <0-10>,
  "memory_quality": <0-10>,
  "reasoning": "<brief explanation>"
}

Scoring guide:
- coherence: Does the response make sense and follow naturally from the conversation?
- persona_adherence: Does the agent's tone match the expected persona (ari=direct/blunt, donna=strategic/warm, ted=enthusiastic)?
- tool_usage: Did the agent use tools appropriately? (N/A scenarios score 7)
- brand_voice_compliance: lowercase, no em dashes, no emojis, concise, no filler words?
- task_completion: Did the agent accomplish what the user needed?
- memory_quality: Did the agent remember/use relevant context appropriately?`;

const DEFAULT_SCORES: JudgeScores = {
  coherence: 5,
  persona_adherence: 5,
  tool_usage: 5,
  brand_voice_compliance: 5,
  task_completion: 5,
  memory_quality: 5,
};

export async function judgeScenario(
  scenario: EvalScenario,
  transcript: Array<{ role: string; content: string }>
): Promise<JudgeScores & { reasoning: string }> {
  const model = process.env.EVAL_JUDGE_MODEL ?? "gpt-4o";

  const judgePrompt = `## Scenario
Key: ${scenario.key}
Description: ${scenario.description}

## Expected
${JSON.stringify(scenario.expected, null, 2)}

## Transcript
${transcript.map((m) => `${m.role}: ${m.content}`).join("\n\n")}

Score the agent's performance. Return ONLY valid JSON.`;

  try {
    const result = await generateText({
      model: openai(model),
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: judgePrompt }],
    });

    const parsed = JSON.parse(result.text);

    return {
      coherence: clampScore(parsed.coherence),
      persona_adherence: clampScore(parsed.persona_adherence),
      tool_usage: clampScore(parsed.tool_usage),
      brand_voice_compliance: clampScore(parsed.brand_voice_compliance),
      task_completion: clampScore(parsed.task_completion),
      memory_quality: clampScore(parsed.memory_quality),
      reasoning: parsed.reasoning ?? "no reasoning provided",
    };
  } catch (err) {
    console.error("Judge failed, using defaults:", err);
    return { ...DEFAULT_SCORES, reasoning: `judge error: ${err}` };
  }
}

function clampScore(value: unknown): number {
  const num = Number(value);
  if (isNaN(num)) return 5;
  return Math.max(0, Math.min(10, num));
}
