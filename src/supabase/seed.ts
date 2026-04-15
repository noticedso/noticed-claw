// src/supabase/seed.ts
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env for standalone execution (outside Next.js)
try {
  const envPath = resolve(__dirname, "../../.env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env not found — rely on existing env vars
}

// --- Seeded PRNG ---------------------------------------------------------------

/**
 * Simple seeded PRNG (mulberry32) for deterministic data generation.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Random integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// --- Data Pools ----------------------------------------------------------------

export const SKILLS_POOL = [
  "TypeScript", "Rust", "Go", "Python", "React", "Next.js", "PostgreSQL",
  "Redis", "Docker", "Kubernetes", "GraphQL", "gRPC", "ML/AI", "LLMs",
  "Embeddings", "Systems Programming", "WebAssembly", "Distributed Systems",
  "Event Sourcing", "CQRS", "Observability", "SRE", "Platform Engineering",
  "Security", "Cryptography", "WebRTC", "Edge Computing", "Serverless",
  "ClickHouse", "Kafka", "Flink", "dbt", "Data Engineering", "Computer Vision",
  "NLP", "RAG", "Vector DBs", "Fine-tuning", "Prompt Engineering", "DevOps",
  "CI/CD", "Terraform", "AWS", "GCP", "Tailwind", "tRPC", "Prisma", "Drizzle",
  "Supabase", "Swift",
];

const FIRST_NAMES = [
  "Alex", "Jordan", "Morgan", "Taylor", "Casey", "Riley", "Quinn", "Avery",
  "Blake", "Cameron", "Drew", "Emery", "Finley", "Harper", "Hayden", "Jamie",
  "Kendall", "Logan", "Micah", "Noel", "Parker", "Reese", "Sage", "Skylar",
  "Tatum", "Devon", "Ellis", "Frankie", "Gray", "Indigo", "Jules", "Kit",
  "Lane", "Marley", "Nico", "Oakley", "Peyton", "Remy", "Shiloh", "Toby",
  "Val", "Winter", "Zion", "Ash", "Briar", "Cypress", "Dakota", "Eden",
  "Flynn", "Greer",
];

const LAST_NAMES = [
  "Chen", "Patel", "Kim", "Nguyen", "Santos", "Müller", "Schmidt", "Tanaka",
  "Ivanov", "Johansson", "Garcia", "Silva", "Okafor", "Khan", "Lee",
  "Williams", "Brown", "Jones", "Davis", "Wilson", "Moore", "Anderson",
  "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Robinson",
  "Clark", "Lewis", "Walker", "Hall", "Young", "King", "Wright", "Hill",
  "Scott", "Green", "Baker", "Adams", "Nelson", "Carter", "Mitchell",
  "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans",
];

const REPO_TEMPLATES: Array<{ pattern: string; languages: string[] }> = [
  { pattern: "{skill}-server", languages: ["TypeScript", "Go", "Rust", "Python"] },
  { pattern: "{skill}-cli", languages: ["Rust", "Go", "TypeScript", "Python"] },
  { pattern: "{skill}-dashboard", languages: ["TypeScript", "JavaScript"] },
  { pattern: "{skill}-api", languages: ["TypeScript", "Go", "Python", "Rust"] },
  { pattern: "{skill}-sdk", languages: ["TypeScript", "Python", "Go", "Rust"] },
  { pattern: "{skill}-playground", languages: ["TypeScript", "Python"] },
  { pattern: "{skill}-benchmark", languages: ["Rust", "Go", "Python"] },
  { pattern: "{skill}-plugin", languages: ["TypeScript", "Go"] },
  { pattern: "{skill}-worker", languages: ["TypeScript", "Rust", "Go"] },
  { pattern: "{skill}-proxy", languages: ["Go", "Rust", "TypeScript"] },
  { pattern: "{skill}-monitor", languages: ["Go", "TypeScript", "Python"] },
  { pattern: "{skill}-toolkit", languages: ["TypeScript", "Python", "Rust"] },
  { pattern: "{skill}-examples", languages: ["TypeScript", "Python", "Go"] },
  { pattern: "{skill}-template", languages: ["TypeScript", "Python"] },
  { pattern: "{skill}-adapter", languages: ["TypeScript", "Go", "Rust"] },
];

const BIO_TEMPLATES = [
  "building {skill1} tools. previously worked on {skill2} at scale.",
  "staff engineer focused on {skill1} and {skill2}. open source contributor.",
  "{skill1} enthusiast. exploring {skill2} and {skill3}.",
  "shipping {skill1} in production. {skill2} on the side.",
  "infrastructure engineer. {skill1}, {skill2}, and lots of {skill3}.",
  "full-stack dev with a passion for {skill1}. dabbling in {skill2}.",
  "making {skill1} accessible. {skill2} advocate.",
  "developer experience at a {skill1} company. loves {skill2}.",
  "{skill1} core contributor. building the future of {skill2}.",
  "systems thinker. {skill1} by day, {skill2} by night.",
];

// --- Helper Functions ----------------------------------------------------------

/**
 * Pick `count` random unique items from an array (Fisher-Yates partial shuffle).
 */
export function pickRandom<T>(arr: T[], min: number, max: number, rng: SeededRandom): T[] {
  const count = rng.int(min, Math.min(max, arr.length));
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function toKebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// --- Profile Generation --------------------------------------------------------

export interface SeedProfile {
  login: string;
  name: string;
  bio: string;
  skills: string[];
  repos: Array<{ name: string; description: string; language: string; stars: number }>;
  activity: { commitCount: number; languages: string[]; recentRepos: string[] };
}

/**
 * Generate a single developer profile deterministically.
 */
export function generateProfile(index: number, rng: SeededRandom): SeedProfile {
  // Cross first/last with offset so 100 profiles get unique combinations
  // first name cycles 0-49, last name shifts by floor(index/50) to avoid same pairing
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastNameOffset = Math.floor(index / FIRST_NAMES.length) * 7; // prime offset
  const lastName = LAST_NAMES[(index + lastNameOffset) % LAST_NAMES.length];
  const name = `${firstName} ${lastName}`;
  const login = `${firstName.toLowerCase()}${lastName.toLowerCase()}${index}`;

  // Skills: 4-8
  const skills = pickRandom(SKILLS_POOL, 4, 8, rng);

  // Bio from template
  const bioTemplate = BIO_TEMPLATES[Math.floor(rng.next() * BIO_TEMPLATES.length)];
  const bio = bioTemplate
    .replace("{skill1}", skills[0] || "TypeScript")
    .replace("{skill2}", skills[1] || "Go")
    .replace("{skill3}", skills[2] || "Rust");

  // Repos: 5-15
  const repoCount = rng.int(5, 15);
  const repos: SeedProfile["repos"] = [];
  const usedRepoNames = new Set<string>();

  for (let r = 0; r < repoCount; r++) {
    const template = REPO_TEMPLATES[Math.floor(rng.next() * REPO_TEMPLATES.length)];
    const skill = skills[Math.floor(rng.next() * skills.length)];
    let repoName = template.pattern.replace("{skill}", toKebab(skill));

    // Ensure unique repo names
    if (usedRepoNames.has(repoName)) {
      repoName = `${repoName}-${r}`;
    }
    usedRepoNames.add(repoName);

    const language = template.languages[Math.floor(rng.next() * template.languages.length)];
    const stars = Math.floor(rng.next() * rng.next() * 5000); // Power-law distribution

    repos.push({
      name: repoName,
      description: `${skill} ${template.pattern.replace("{skill}-", "")} project`,
      language,
      stars,
    });
  }

  // Activity
  const commitCount = rng.int(50, 5000);
  const languages = [...new Set(repos.map((r) => r.language))];
  const recentRepos = repos.slice(0, rng.int(2, 5)).map((r) => r.name);

  return {
    login,
    name,
    bio,
    skills,
    repos,
    activity: { commitCount, languages, recentRepos },
  };
}

// --- Connection Generation -----------------------------------------------------

/**
 * Generate bidirectional connections for N profiles.
 * Each profile targets 8-15 connections. Bidirectionality can push counts higher.
 */
export function generateConnections(count: number, rng: SeededRandom): number[][] {
  const connections: Set<number>[] = Array.from({ length: count }, () => new Set<number>());

  for (let i = 0; i < count; i++) {
    const targetCount = rng.int(8, 15);
    let attempts = 0;

    while (connections[i].size < targetCount && attempts < targetCount * 3) {
      const j = Math.floor(rng.next() * count);
      if (j !== i) {
        connections[i].add(j);
        connections[j].add(i); // Bidirectional
      }
      attempts++;
    }
  }

  return connections.map((set) => [...set].sort((a, b) => a - b));
}

// --- Main Seed Script ----------------------------------------------------------

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const rng = new SeededRandom(20260415); // Deterministic seed
  const PROFILE_COUNT = 100;

  console.log(`Generating ${PROFILE_COUNT} developer profiles...`);

  // Generate profiles
  const profiles = Array.from({ length: PROFILE_COUNT }, (_, i) =>
    generateProfile(i, rng)
  );

  // Generate connections
  const connectionRng = new SeededRandom(20260415 + 1);
  const connectionIndices = generateConnections(PROFILE_COUNT, connectionRng);

  // Insert profiles first (without connections, to get UUIDs)
  const { data: inserted, error: insertError } = await supabase
    .from("developer_profiles")
    .upsert(
      profiles.map((p) => ({
        login: p.login,
        name: p.name,
        bio: p.bio,
        skills: p.skills,
        repos: p.repos,
        activity: p.activity,
      })),
      { onConflict: "login" }
    )
    .select("id, login");

  if (insertError) {
    console.error("Failed to insert profiles:", insertError.message);
    process.exit(1);
  }

  if (!inserted || inserted.length === 0) {
    console.error("No profiles inserted");
    process.exit(1);
  }

  console.log(`Inserted ${inserted.length} profiles. Updating connections...`);

  // Map index -> UUID
  const idByLogin = new Map(inserted.map((r) => [r.login, r.id]));
  const idByIndex = profiles.map((p) => idByLogin.get(p.login)!);

  // Update connections with UUIDs
  for (let i = 0; i < PROFILE_COUNT; i++) {
    const connUuids = connectionIndices[i].map((idx) => idByIndex[idx]).filter(Boolean);
    await supabase
      .from("developer_profiles")
      .update({ connections: connUuids })
      .eq("id", idByIndex[i]);
  }

  console.log("Connections updated.");

  // Generate embeddings via AI SDK
  console.log("Generating embeddings...");
  try {
    const { embedMany } = await import("ai");
    const { openai } = await import("@ai-sdk/openai");

    const texts = profiles.map(
      (p) =>
        `${p.name} - ${p.bio}\nSkills: ${p.skills.join(", ")}\nRepos: ${p.repos.map((r) => r.name).join(", ")}`
    );

    // Batch in chunks of 20
    const BATCH_SIZE = 20;
    for (let start = 0; start < texts.length; start += BATCH_SIZE) {
      const batch = texts.slice(start, start + BATCH_SIZE);
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: batch,
      });

      for (let j = 0; j < batch.length; j++) {
        const idx = start + j;
        await supabase
          .from("developer_profiles")
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq("id", idByIndex[idx]);
      }

      console.log(`  Embedded ${Math.min(start + BATCH_SIZE, texts.length)}/${texts.length}`);
    }
  } catch (err) {
    console.warn("Embedding generation failed (OPENAI_API_KEY may be missing):", err);
    console.warn("Profiles seeded without embeddings. Run again with OPENAI_API_KEY to add them.");
  }

  console.log("Seed complete!");
}

// Run if executed directly
const isMain = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isMain) {
  main().catch(console.error);
}
