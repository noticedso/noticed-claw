export interface EvalScenario {
  key: string;
  description: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  expected: Record<string, unknown>;
}

export interface JudgeScores {
  coherence: number;
  persona_adherence: number;
  tool_usage: number;
  brand_voice_compliance: number;
  task_completion: number;
  memory_quality: number;
}

export interface EvalResult {
  scenarioKey: string;
  scores: JudgeScores;
  transcript: Array<{ role: string; content: string }>;
  judgeReasoning: string;
  avgScore: number;
}

export interface EvalRun {
  id: string;
  scenarioCount: number;
  avgScore: number;
  results: EvalResult[];
  createdAt: string;
}
