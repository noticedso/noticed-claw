// src/lib/agent/types.ts

export type PersonaKey = "ari" | "donna" | "ted";
export type ToolProfile = "minimal" | "standard" | "full";
export type MessageRole = "system" | "user" | "assistant" | "tool";
export type MemoryCategory = "preference" | "decision" | "fact" | "commitment" | "milestone";
export type MemoryStatus = "active" | "superseded" | "archived";
export type MemoryType = "daily" | "curated";
export type MissionKind = "mission" | "goal";
export type MissionType = "onboarding" | "audience_building" | "outreach";
export type MissionStatus = "active" | "completed" | "paused" | "abandoned";
export type ScheduleKind = "at" | "every" | "cron";
export type SessionTarget = "main" | "isolated";

export interface ToolPolicy {
  allow?: string[];
  deny?: string[];
}

export interface TenantConfig {
  model: string;
  persona: PersonaKey;
  heartbeatEnabled: boolean;
  heartbeatIntervalMs: number;
  activeHoursStart: number;
  activeHoursEnd: number;
  timezone: string;
  toolPolicy: ToolPolicy;
  preferredChannel?: string;
}

export interface Tenant {
  id: string;
  userId: string;
  name: string;
  config: TenantConfig;
  nextHeartbeatAt: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  tenantId: string;
  sessionKey: string;
  channel: string;
  chatType: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  compactionCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  tokenCount: number;
  compactedAt: string | null;
  createdAt: string;
}

export interface Memory {
  id: string;
  tenantId: string;
  content: string;
  memoryType: MemoryType;
  category: MemoryCategory;
  status: MemoryStatus;
  supersededBy: string | null;
  confidence: number;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryRecall {
  id: string;
  content: string;
  category: string;
  memoryType: string;
  similarity: number;
}

export interface CompactionSummary {
  id: string;
  sessionId: string;
  summary: string;
  messagesSummarized: number;
  tokensBefore: number;
  tokensAfter: number;
  createdAt: string;
}

export interface Checkpoint {
  key: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export interface Mission {
  id: string;
  tenantId: string;
  kind: MissionKind;
  missionType: MissionType | null;
  status: MissionStatus;
  title: string;
  objective: string;
  checkpoints: Checkpoint[];
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceFile {
  id: string;
  tenantId: string;
  fileName: string;
  content: string;
  isDeleted: boolean;
  updatedAt: string;
}

export interface CronJob {
  id: string;
  tenantId: string;
  name: string;
  scheduleKind: ScheduleKind;
  scheduleValue: string;
  scheduleTimezone: string;
  sessionTarget: SessionTarget;
  payloadText: string;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  tenantId: string;
  sessionId: string;
  summary: string;
  source: "recent_messages" | "compaction";
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummaryWithSession extends SessionSummary {
  session: Pick<Session, "channel" | "chatType" | "updatedAt">;
}

export interface AgentContext {
  tenant: Tenant;
  session: Session;
  messages: Message[];
  workspaceFiles: WorkspaceFile[];
  memories: MemoryRecall[];
  activeMission: Mission | null;
  goals: Mission[];
  sessionSummaries: SessionSummaryWithSession[];
  compactionSummary: CompactionSummary | null;
}

export interface AgentTurnInput {
  tenantId: string;
  sessionKey: string;
  userMessage: string;
  platform: string;
  chatType: string;
  peerId: string;
  dedupeKey?: string;
}

export interface AgentTurnResult {
  content: string | null;
  silent: boolean;
  sessionId: string;
  tokens: { input: number; output: number; total: number };
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  profile: ToolProfile;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: AgentContext) => Promise<unknown>;
}

export interface Capability {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, unknown>;
}

export interface DeveloperProfile {
  id: string;
  login: string;
  name: string;
  bio: string;
  skills: string[];
  repos: Array<{ name: string; description: string; language: string; stars: number }>;
  connections: string[];
  activity: { commitCount: number; languages: string[]; recentRepos: string[] };
  createdAt: string;
}
