import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import type { EvalScenario } from "../types";

export function loadScenarios(): EvalScenario[] {
  const dir = join(__dirname, ".");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort();

  return files.map((file) => {
    const content = readFileSync(join(dir, file), "utf-8");
    const parsed = parse(content);

    if (!parsed.key || !parsed.messages || !parsed.expected) {
      throw new Error(`Invalid scenario file ${file}: missing key, messages, or expected`);
    }

    return {
      key: parsed.key,
      description: parsed.description ?? "",
      messages: parsed.messages,
      expected: parsed.expected,
    };
  });
}
