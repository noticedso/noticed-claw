import type { Capability } from "../types";

export function scoreCapability(cap: Capability, query: string): number {
  const q = query.toLowerCase();
  const name = cap.name.toLowerCase();
  const desc = cap.description.toLowerCase();

  if (name === q) return 3;
  if (name.startsWith(q)) return 2;

  const tokens = q.split(/\s+/);
  return tokens.filter((t) => name.includes(t) || desc.includes(t)).length;
}

export function searchCapabilities(
  capabilities: Capability[],
  query: string,
  limit: number
): Capability[] {
  return capabilities
    .map((cap) => ({ cap, score: scoreCapability(cap, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ cap }) => cap);
}

export const CAPABILITIES: Capability[] = [
  {
    name: "memory_search",
    description: "search memories by semantic similarity",
    category: "memory",
    parameters: { query: { type: "string", description: "search query" } },
  },
  {
    name: "memory_get",
    description: "get a specific memory by ID",
    category: "memory",
    parameters: { id: { type: "string", description: "memory ID" } },
  },
  {
    name: "workspace_write",
    description: "update a workspace file",
    category: "workspace",
    parameters: {
      file: { type: "string", description: "file name" },
      content: { type: "string", description: "new content" },
    },
  },
  {
    name: "cron",
    description: "manage scheduled jobs (add, update, remove, list)",
    category: "scheduling",
    parameters: {
      action: { type: "string", description: "add | update | remove | list" },
    },
  },
  {
    name: "mission",
    description: "manage goals and missions. set_goal creates a new goal with title, objective, and checkpoints. list shows current missions/goals. complete_checkpoint marks progress.",
    category: "missions",
    parameters: {
      action: { type: "string", description: "set_goal | list | complete_checkpoint" },
      title: { type: "string", description: "goal title" },
      objective: { type: "string", description: "what to achieve" },
    },
  },
  {
    name: "fs_ls",
    description: "list directory with summaries. use fs_read for full profile details",
    category: "filesystem",
    parameters: { path: { type: "string", description: "directory path: /developers, /connections, /repos, /me" } },
  },
  {
    name: "fs_read",
    description: "read full developer profile: name, bio, skills, repos, activity. path like /developers/alexchen0.md",
    category: "filesystem",
    parameters: { path: { type: "string", description: "file path e.g. /developers/alexchen0.md" } },
  },
  {
    name: "fs_grep",
    description: "search all developer profiles by keyword in name, bio, or skills. e.g. 'Rust' or 'distributed systems'",
    category: "filesystem",
    parameters: {
      pattern: { type: "string", description: "search pattern" },
    },
  },
  {
    name: "web_search",
    description: "search the web for information",
    category: "web",
    parameters: { query: { type: "string", description: "search query" } },
  },
  {
    name: "web_fetch",
    description: "fetch and extract content from a URL",
    category: "web",
    parameters: { url: { type: "string", description: "URL to fetch" } },
  },
  {
    name: "conversation_search",
    description: "search conversation history by keyword",
    category: "sessions",
    parameters: { query: { type: "string", description: "search query" } },
  },
  {
    name: "conversation_browse",
    description: "browse messages in a session",
    category: "sessions",
    parameters: {
      sessionId: { type: "string", description: "session ID" },
    },
  },
  {
    name: "switch_persona",
    description:
      "switch the agent's persona. ari (direct, blunt), donna (strategic, warm), ted (enthusiastic, supportive)",
    category: "identity",
    parameters: {
      persona: {
        type: "string",
        description: "persona key: ari, donna, or ted",
      },
    },
  },
];
