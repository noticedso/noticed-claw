# Multi-tenant agent architecture

a workshop by [noticed](https://noticed.so)

---

## 1. what is noticed

AI is making us 10x more productive but 10x less connected.

cold outreach is dead — when AI agents flood every inbox, only warm intros work (~80% reply rate vs 5% cold). and if you're in demand, thousands of requests daily bury the best opportunities.

artists have agents. athletes have agents. who represents founders, builders, operators, investors?

**noticed is a personal agent that networks while you sleep.**

- **understands your intent** — lives in your messaging apps, learns what you're looking for (fundraising, hiring, partnerships), never shares without approval
- **maps your network** — combines public data (GitHub, LinkedIn) with private context (conversations, meeting notes) to find warm paths you didn't know existed
- **makes the move** — doesn't just answer questions, it acts. makes the warm intro, follows through, only brings you in when it matters

the agent runs 24/7 across Telegram, Slack, and a web interface. it remembers everything, learns your preferences, and gets sharper over time.

but here's the thing: every user gets their own agent. their own persona, their own memory, their own network map, their own scheduled jobs. that's the multi-tenant problem we're solving today.

---

## 2. your harness is your agent

an agent is an LLM interacting with tools and data. the system around the LLM that facilitates that interaction is the **harness**. Claude Code, OpenClaw, Codex, Deep Agents — these are all harnesses.

harnesses are not going away. when Claude Code's source code leaked, it was 512k lines of code. even the makers of the best models invest heavily in the scaffolding around them.

### why this matters: memory is the harness

memory isn't a plugin you bolt onto an agent. as sarah wooders (Letta) put it:

> asking to plug memory into an agent harness is like asking to plug driving into a car.

the harness decides:

- how context is loaded (system prompt, workspace files, session history)
- what survives compaction and what's lost
- how long-term memory is stored, recalled, and updated
- how the agent's personality and instructions persist across sessions

**if you don't own your harness, you don't own your memory.** and without memory, your agent is easily replicable by anyone with access to the same tools. memory is what makes agents sticky — it's what lets them get better over time, personalize to each user, and build up a proprietary dataset of interactions and preferences.

---

## 3. the OpenClaw story

this workshop repo exists because we tried to clone [OpenClaw](https://github.com/open-claw) — and learned that running an agent for one user on your laptop is a completely different problem than running one for thousands of users in the cloud.

### phase 1: "let's just copy it"

OpenClaw is an open-source personal agent framework. it has workspace files (`SOUL.md`, `IDENTITY.md`, `AGENTS.md`), heartbeat-driven proactive messaging, memory with compaction, and a tool system. exactly what we needed.

so we started porting it. first commit: seed default workspace files from templates, wire `BOOTSTRAP.md` into the prompt builder, activate memory flush and compaction in the live turn pipeline.

```
# march 20, 2026 — the OpenClaw sprint

d2568bd  refactor personal chat routing around OpenClaw-style sessions and delivery
966b4ec  refactor workspace files around OpenClaw-style bootstrap context
5d57dbe  complete OpenClaw gateway phase with unified outbound runners
```

### phase 2: "this doesn't scale"

OpenClaw is designed for one user running one agent. our system needed tenant isolation, shared infrastructure, concurrent webhooks, token economics, and session awareness across platforms.

we kept the patterns but rebuilt the plumbing. the session registry became a first-class database table. the outbound delivery became a unified ledger. heartbeat and cron got shared automation runners instead of duplicated logic.

### phase 3: "adapt, don't clone"

by april 2026, we'd kept the OpenClaw vocabulary (workspace files, heartbeat, missions, personas) but the implementation was entirely our own. the workspace files pattern stayed, but backed by Supabase instead of local disk. memory used pgvector embeddings instead of flat search. the tool system got a capability registry with fuzzy discovery instead of a flat tool list.

the name `noticed-claw` is a nod to that journey. we started by cloning the claw; we ended up building something different.

---

## 4. one user is easy, many users is hard

most agent harnesses are built for **one user running one agent**. OpenClaw reads workspace files from local disk. Claude Code stores state in `~/.claude/`. Codex generates encrypted compaction summaries tied to one session.

this works great on your laptop. now imagine running it for 1,000 users.

### what changes when you go multi-tenant

| single-tenant | multi-tenant |
| --- | --- |
| workspace files on disk | workspace files in a database, scoped by `tenant_id` |
| one conversation thread | hundreds of sessions across platforms per tenant |
| memory in a local file | semantic memory with embeddings, isolated per tenant |
| one system prompt | prompt assembly with per-tenant persona + shared brand rules |
| tools are always available | tool policy engine — different tenants get different capabilities |
| compaction when you feel like it | compaction policies — bounded cost per tenant |
| cron on your machine | timezone-aware scheduled jobs across all tenants |
| no concurrency issues | webhook dedup, thread-level locking, concurrent writes |

the core insight: **every component that a single-user harness handles implicitly must become an explicit, tenant-scoped subsystem.**

### the new problems

**tenant isolation.** user A's memories, conversations, and workspace must be invisible to user B. row-level security on every table.

**session identity.** the same user talks to your agent on webchat, telegram, and slack. the agent needs to know about all its conversations — but keep each session's history separate.

**context economics.** memory, compaction, and embeddings cost money per user. one user's unbounded conversation can't blow your budget for everyone else.

**concurrent webhooks.** telegram sends duplicate webhooks. slack retries on timeout. you need thread-level locking so the agent doesn't respond twice to the same message.

**proactive behavior at scale.** one user's heartbeat cron is a `setInterval`. a thousand users' heartbeats are a shared automation runner that respects each tenant's timezone and active hours.

---

## 5. noticed-claw: the distilled version

this repo is a self-contained implementation of a multi-tenant agent harness. 24 features from our production system, rebuilt as a Next.js app you can run locally. no monorepo, no ClickHouse — just Supabase, AI SDK, and the architectural patterns that actually matter.

### the turn pipeline

every message — webchat, telegram, or cron — flows through the same pipeline:

```
inbound → agent-router → thread-queue → parallel pre-fetch → prompt-builder → llm-runner → post-turn hooks
            │                │                │                    │               │              │
      resolve tenant    dedupe webhooks   workspace files     identity +       tool-call      store message
      + session                           memory recall       brand voice      loop (max 10)  extract memories
                                          session awareness   persona overlay  code mode      check compaction
                                          active missions                      (2 meta-tools) verify checkpoints
```

### the 8 building blocks

| # | block | what it does | single → multi-tenant challenge |
| --- | --- | --- | --- |
| 1 | **tenant isolation** | RLS policies scope every query by `tenant_id` | doesn't exist in single-tenant |
| 2 | **session management** | composite key: `tenant:channel:chatType:peerId` | single-tenant has one implicit session |
| 3 | **persona + brand voice** | immutable brand rules + swappable persona per tenant | single-tenant has one hardcoded personality |
| 4 | **semantic memory** | two-tier (daily/curated) with pgvector embeddings + dedup | single-tenant uses flat files |
| 5 | **context compaction** | summarize when tokens > 48k, soft-archive messages | single-tenant has no cost pressure |
| 6 | **tool policy engine** | profile levels (minimal/standard/full) + allow/deny | single-tenant exposes all tools |
| 7 | **code mode** | 2 meta-tools (search + execute) over capability registry | single-tenant sends all tools every turn |
| 8 | **proactive automation** | heartbeat + cron with timezone-aware active hours | single-tenant uses local cron |

### key design decisions

**brand voice is immutable.** a tenant can pick ari's blunt style or ted's enthusiasm, but neither can override "lowercase always" or "no filler phrases."

**code mode reduces context cost.** instead of 30+ tool descriptions burning tokens on every turn, the agent gets 2 meta-tools: `search` (discover capabilities) and `execute` (run one by name).

**memory dedup via cosine similarity.** new memories are compared against existing ones. similarity > 0.92 → the old memory is superseded, not deleted. prevents unbounded growth while keeping an audit trail.

**thread queue prevents duplicate responses.** `INSERT ... ON CONFLICT DO NOTHING` + `SELECT ... FOR UPDATE SKIP LOCKED` ensures only one turn runs per thread at a time.

### module map

```
src/lib/agent/
├── types.ts              ← start here: every interface
├── agent-turn.ts         ← the orchestration spine
├── agent-router.ts       ← tenant + session resolution
├── prompt-builder.ts     ← system prompt assembly
├── llm-runner.ts         ← tool-call loop
├── stream-bridge.ts      ← streaming + silent detection
├── brand-voice.ts        ← immutable brand rules
├── persona-catalog.ts    ← ari / donna / ted
├── session-manager.ts    ← session keys + CRUD
├── memory-manager.ts     ← extract, embed, dedup, recall
├── compaction.ts         ← summarize + soft-archive
├── mission-engine.ts     ← missions, goals, checkpoints
├── workspace-files.ts    ← 7 per-tenant documents
├── session-awareness.ts  ← cross-session context
├── heartbeat.ts          ← proactive check-ins
├── cron.ts               ← scheduled jobs
├── thread-queue.ts       ← webhook dedup
├── virtual-fs.ts         ← read-only fs over seeded data
└── tools/
    ├── registry.ts           ← profile + policy filtering
    ├── capability-registry.ts ← fuzzy search
    ├── code-mode.ts          ← search + execute meta-tools
    └── [9 tool files]
```

---

## 6. demo: talk to your agent

```bash
npm run dev
```

open http://localhost:3012/chat

### things to try

1. **persona selection** — "i want the blunt, no-nonsense version" (switches to ari)
2. **workspace customization** — "update my identity - i'm a backend engineer focused on distributed systems"
3. **network exploration** — "who in my network knows Rust?"
4. **memory in action** — tell the agent a preference, then later see if it remembers
5. **cron jobs** — "remind me every Monday at 9am to review my connections"
6. **cross-session awareness** — open a second session, ask the agent what it's been up to

---

## 7. improve with evals

### run the baseline

```bash
npm run eval
```

each run outputs scores to the terminal AND saves a CSV to `eval-results/`:

```
results:
  onboarding_persona_selection: 8.3/10 (tool:7 task:8)
  workspace_update_user: 5.8/10 (tool:3 task:3)     <-- weak spot
  ...
average: 7.5/10

csv: eval-results/eval-2026-04-15T07-55-16.csv
```

### the eval loop (walkthrough)

this is a real example from building this workshop. we started at 5.8/10 and got to 8.2/10 in 4 iterations.

**iteration 1: baseline (5.8/10)**

problem: all scenarios scored 0 because `runAgentTurn` passed an empty messages array to the LLM.

```
InvalidPromptError: messages must not be empty
```

fix: append user message to `ctx.messages` before calling `runLLM`.

**iteration 2: tool wiring (7.4/10)**

problem: `llm-runner.ts` passed raw JSON Schema tool definitions but AI SDK v4 requires Zod schemas. the LLM had tools defined but couldn't call them.

```
judge: "the agent did not use fs_read to retrieve developer details"
judge: "did not perform the expected search or return developer names"
```

fix: rewrote `llm-runner.ts` to build Zod-based `search`/`execute` tools. expanded prompt with `fs_ls → fs_read` chain examples.

**iteration 3: cron patterns (7.9/10)**

problem: user asked "remind me every Monday at 9am" and the agent said "use a calendar app."

```
judge: "the agent did not use the appropriate tool to set up a cron job"
```

fix: added cron tool examples to the system prompt with exact arg shapes.

**iteration 4: workspace writes + transcript visibility (8.2/10)**

problem: `workspace_update_user` scored 5.8 with tool:3 — but the agent WAS calling `workspace_write`. the eval transcript only captured text responses, not tool calls, so the judge couldn't see them.

```
[runLLM] tool call: execute({"name":"workspace_write","args":{"file":"USER.md",...}})
[runLLM] tool result: execute → {"success":true,"file":"USER.md"}
```

fix: added tool calls to the eval transcript. also added a "mandatory behavior" rule to the prompt: "when you learn the user's name, IMMEDIATELY call workspace_write to update USER.md."

result:

| scenario | run 1 | run 4 |
|----------|-------|-------|
| developer_details | 3.3 | 9.2 |
| workspace_update_user | - | 8.3 |
| cron_job_creation | 4.7 | 9.0 |
| skill_search | 5.8 | 8.8 |
| filesystem_developer_search | 6.0 | 9.0 |
| **average** | **5.8** | **8.2** |

### try it yourself

1. run `npm run eval` and check `eval-results/` for the CSV
2. find the lowest-scoring scenario
3. read the judge reasoning in the CSV or at `/dashboard/evals`
4. make a change — usually in `src/lib/agent/prompt-builder.ts` (tool instructions) or `src/lib/agent/workspace-files.ts` (agent rules)
5. run `npm run eval` again
6. compare CSVs — did the target improve? did anything regress?

```bash
# compare two runs side by side
diff eval-results/eval-2026-04-15T07-55-16.csv eval-results/eval-2026-04-15T08-05-25.csv
```

### what to try improving

- **workspace writes on user info** — does the agent update USER.md when you tell it your name?
- **persona consistency** — does ari sound blunt? does ted sound enthusiastic?
- **tool choice** — does the agent use `fs_read` (not `fs_grep`) for developer details?
- **brand voice** — lowercase, no filler, concise?
- **memory recall** — does the agent remember preferences from earlier in the session?

### adding new scenarios

create a YAML file in `src/eval/scenarios/`:

```yaml
key: my_new_scenario
description: what this tests
messages:
  - role: user
    content: "the user's message"
  - role: user
    content: "a follow-up message"
expected:
  some_check: true
  another_check: "expected value"
```

the `expected` field is passed to the LLM judge as context. the judge uses it to evaluate the transcript, but it's not a hard assertion — it's guidance for scoring.

---

## appendix: database schema

13 tables, all scoped by `tenant_id` with row-level security:

| table | rows per tenant | purpose |
| --- | --- | --- |
| tenants | 1 | config, persona, heartbeat schedule |
| sessions | ~5-20 | one per channel/platform combo |
| messages | hundreds-thousands | conversation history |
| memories | tens-hundreds | semantic memory with embeddings |
| compaction_summaries | ~1 per compaction | compressed message history |
| missions | ~3-5 | onboarding, audience building, outreach |
| workspace_files | 7 | agent personality and behavior docs |
| cron_jobs | 0-10 | scheduled tasks |
| session_summaries | ~1 per session | cross-session awareness |
| thread_inbound_queue | transient | webhook dedup |
| developer_profiles | 100 (shared) | seeded virtual filesystem data |
| eval_runs | per eval execution | eval history |
| eval_results | per scenario per run | scores + reasoning |
