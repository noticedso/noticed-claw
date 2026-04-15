# Cloning OpenClaw to run in the cloud for thousands of users

a workshop on multi-tenant agent architecture by [noticed](https://noticed.so)

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

## 2. the OpenClaw story

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

the plan was literal: "align the agent system more closely with the OpenClaw behaviors already described in the repo."

### phase 2: "this doesn't scale"

OpenClaw is designed for one user running one agent. our system needed:

- **tenant isolation** — each user's agent must be walled off from every other
- **shared infrastructure** — one database, one deployment, one cron system serving all tenants
- **concurrent webhooks** — Telegram sends duplicate webhooks, Slack retries on timeout, you need thread-level locking
- **token economics** — memory, compaction, and embeddings cost money per user, so you need budgets and policies
- **session awareness** — the agent talks to the same user across multiple platforms and needs to know about all its conversations

we kept the patterns but rebuilt the plumbing. the session registry became a first-class database table. the outbound delivery became a unified ledger. heartbeat and cron got shared automation runners instead of duplicated logic.

```
# the gateway rewrite

"move noticed from an OpenClaw-inspired routing layer to a more faithful
 gateway architecture where session identity, delivery routing, runner state,
 and cross-session context are persisted as first-class records rather than
 inferred from tenant.config and agent_sessions.metadata."
```

### phase 3: "adapt, don't clone"

by april 2026, we'd kept the OpenClaw vocabulary (workspace files, heartbeat, missions, personas) but the implementation was entirely our own. the workspace files pattern stayed, but backed by Supabase instead of local disk. memory used pgvector embeddings instead of flat search. the tool system got a capability registry with fuzzy discovery instead of a flat tool list.

```
4ec9577  mount workspace files in sessions via Files API
1b0302c  instruct agent to read /workspace/ files (OpenClaw pattern)
```

the name `noticed-claw` is a nod to that journey. we started by cloning the claw; we ended up building something different.

### what this workshop teaches

this repo is the distilled version of that journey. 24 features from our production system, rebuilt as a self-contained Next.js app you can run locally. no monorepo, no ClickHouse, no BigQuery — just Supabase, AI SDK, and the architectural patterns that actually matter.

---

## 3. what is a multi-tenant agent

a multi-tenant agent is a single deployment that runs independent agent instances for multiple users. each user gets their own persona, memory, workspace, tools, and conversation history — but they all share the same infrastructure.

here's how the pieces fit together:

### the building blocks

```
┌─────────────────────────────────────────────────────────────────┐
│                        INBOUND LAYER                            │
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│   │  WebChat  │    │ Telegram │    │  Slack   │    ...           │
│   │ (AI SDK)  │    │(Chat SDK)│    │(Chat SDK)│                  │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘                  │
│        │               │               │                        │
│        └───────────────┬┴───────────────┘                        │
│                        │                                        │
│                        ▼                                        │
│              ┌─────────────────┐                                │
│              │  agent router   │ ── resolve tenant + session    │
│              └────────┬────────┘                                │
│                       │                                        │
│              ┌────────▼────────┐                                │
│              │  thread queue   │ ── dedupe concurrent messages  │
│              └────────┬────────┘                                │
└───────────────────────┼─────────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────────┐
│                       ▼          CONTEXT LAYER                  │
│         ┌─────────────────────────────┐                         │
│         │      parallel pre-fetch     │                         │
│         ├──────────┬──────────┬───────┤                         │
│         │          │          │       │                         │
│         ▼          ▼          ▼       ▼                         │
│   ┌──────────┐ ┌────────┐ ┌──────┐ ┌──────────┐               │
│   │workspace │ │ memory │ │missions│ │ session  │               │
│   │  files   │ │ recall │ │+goals │ │awareness │               │
│   │ (7 docs) │ │(pgvec) │ │       │ │          │               │
│   └──────────┘ └────────┘ └──────┘ └──────────┘               │
│         │          │          │       │                         │
│         └──────────┴──────────┴───────┘                         │
│                       │                                        │
│              ┌────────▼────────┐                                │
│              │ prompt builder  │ ── identity + brand voice      │
│              │                 │    + persona + context          │
│              └────────┬────────┘                                │
└───────────────────────┼─────────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────────┐
│                       ▼         EXECUTION LAYER                 │
│              ┌─────────────────┐                                │
│              │   LLM runner    │ ── tool-call loop (max 10)     │
│              └────────┬────────┘                                │
│                       │                                        │
│         ┌─────────────┼─────────────────┐                       │
│         ▼             ▼                 ▼                       │
│   ┌──────────┐  ┌──────────┐     ┌──────────┐                  │
│   │  search  │  │ execute  │     │ built-in │                  │
│   │(discover)│  │(run cap) │     │  tools   │                  │
│   └──────────┘  └──────────┘     │ web, fs, │                  │
│         code mode                │ memory,  │                  │
│     (2 meta-tools)               │ cron ... │                  │
│                                  └──────────┘                  │
│                       │                                        │
│              ┌────────▼────────┐                                │
│              │ stream bridge   │ ── silent reply detection      │
│              └────────┬────────┘                                │
└───────────────────────┼─────────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────────┐
│                       ▼         POST-TURN LAYER                 │
│         ┌─────────────────────────────┐                         │
│         │    fire-and-forget hooks    │                         │
│         ├──────────┬──────────┬───────┤                         │
│         │          │          │       │                         │
│         ▼          ▼          ▼       ▼                         │
│   ┌──────────┐ ┌────────┐ ┌──────┐ ┌──────────┐               │
│   │  store   │ │extract │ │check │ │ verify   │               │
│   │ message  │ │memories│ │token │ │checkpoint│               │
│   │          │ │        │ │count │ │          │               │
│   └──────────┘ └────────┘ └──┬───┘ └──────────┘               │
│                              │                                 │
│                    ┌─────────▼─────────┐                        │
│                    │ compact if > 48k  │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────────┐
│                       ▼         PROACTIVE LAYER                 │
│                                                                 │
│   ┌──────────────────────────────────────────┐                  │
│   │            /api/agent-cron                │                  │
│   │         (every 5 minutes)                │                  │
│   └──────────┬───────────────┬───────────────┘                  │
│              │               │                                  │
│              ▼               ▼                                  │
│        ┌──────────┐    ┌──────────┐                             │
│        │heartbeat │    │  cron    │                             │
│        │          │    │  jobs    │                             │
│        │check     │    │         │                             │
│        │active    │    │at/every/│                             │
│        │hours,    │    │cron expr│                             │
│        │send if   │    │         │                             │
│        │relevant  │    │timezone │                             │
│        └──────────┘    └──────────┘                             │
│                                                                 │
│   the agent doesn't just respond — it reaches out               │
│   when it has something worth saying                            │
└─────────────────────────────────────────────────────────────────┘
```

### what makes it multi-tenant

the key insight: every box in that diagram is scoped by `tenant_id`. one deployment, one database, one cron endpoint — but each user's agent is completely isolated.

```
┌─────────────────────────────────────────┐
│              TENANT BOUNDARY            │
│                                         │
│   ┌─────────┐  one persona per tenant   │
│   │ persona │  (ari / donna / ted)      │
│   └─────────┘                           │
│                                         │
│   ┌─────────┐  7 workspace files        │
│   │workspace│  (SOUL.md, IDENTITY.md..) │
│   └─────────┘                           │
│                                         │
│   ┌─────────┐  semantic memory          │
│   │ memory  │  with pgvector embeddings │
│   └─────────┘                           │
│                                         │
│   ┌─────────┐  multiple sessions        │
│   │sessions │  (webchat, telegram, ..)  │
│   └─────────┘                           │
│                                         │
│   ┌─────────┐  missions + goals         │
│   │missions │  with checkpoint progress │
│   └─────────┘                           │
│                                         │
│   ┌─────────┐  per-tenant tool policy   │
│   │  tools  │  (allow/deny lists)       │
│   └─────────┘                           │
│                                         │
│   ┌─────────┐  scheduled jobs           │
│   │  cron   │  (timezone-aware)         │
│   └─────────┘                           │
│                                         │
│   all scoped by tenant_id + RLS         │
└─────────────────────────────────────────┘
```

### the 8 building blocks

| # | block | what it does | why it matters for multi-tenant |
|---|-------|-------------|-------------------------------|
| 1 | **tenant isolation** | RLS policies scope every query by `tenant_id` | users can never see each other's data |
| 2 | **session management** | composite key: `tenant:id:channel:chatType:peerId` | same user, multiple platforms, separate histories |
| 3 | **persona + brand voice** | immutable brand rules + swappable persona overlay | brand consistency across all tenants, personality per tenant |
| 4 | **semantic memory** | two-tier (daily/curated) with pgvector embeddings | each tenant's agent remembers independently, with dedup |
| 5 | **context compaction** | summarize when tokens > 48k, soft-archive messages | bounded memory cost per tenant, unbounded conversation length |
| 6 | **tool policy engine** | profile levels (minimal/standard/full) + allow/deny | different tenants get different capabilities |
| 7 | **code mode** | 2 meta-tools (search + execute) over capability registry | 30+ capabilities without paying context cost per tenant turn |
| 8 | **proactive automation** | heartbeat + cron with timezone-aware active hours | agents act independently per tenant's schedule |

---

## 4. architecture walkthrough

<!-- TODO: add code snippets from each module once plans are implemented -->

### the turn pipeline

every message — whether from webchat, telegram, or a cron job — flows through the same pipeline:

1. **agent-router** resolves which tenant and session this message belongs to
2. **thread-queue** deduplicates concurrent webhook deliveries (telegram loves sending duplicates)
3. **parallel pre-fetch** loads workspace files, relevant memories, session awareness, active mission — all at once
4. **prompt-builder** assembles the system prompt: identity, then brand voice (immutable), then persona overlay, then all the context
5. **llm-runner** runs the tool-call loop (up to 10 iterations), with code mode discovering capabilities on demand
6. **silent check** detects `NO_REPLY` / `HEARTBEAT_OK` tokens — if the agent has nothing to say, it stays quiet
7. **post-turn hooks** fire-and-forget: store the message, extract memories, check if compaction is needed, verify mission checkpoints

### key design decisions

**brand voice is immutable.** the prompt builder always injects brand rules between identity and persona. a tenant can pick ari's blunt style or ted's enthusiasm, but neither can override "lowercase always" or "no filler phrases."

**code mode reduces context cost.** instead of sending 30+ tool descriptions to the LLM (which burns tokens on every turn), the agent gets just 2 meta-tools: `search` (discover capabilities by keyword) and `execute` (run one by name). the LLM discovers what it needs on demand.

**memory dedup via cosine similarity.** when a new memory is extracted, it's compared against existing memories. if similarity > 0.92, the old memory is superseded — not deleted, linked. this prevents unbounded memory growth while keeping an audit trail.

**thread queue prevents duplicate responses.** webhook platforms retry on non-200 responses. the thread queue uses `INSERT ... ON CONFLICT DO NOTHING` + `SELECT ... FOR UPDATE SKIP LOCKED` to ensure only one turn runs per thread at a time. queued messages are drained after the active turn completes.

---

## 5. hands-on: explore the code

<!-- TODO: guided tour of key modules with code snippets, added after implementation -->

### module map

```
src/lib/agent/
├── types.ts              ← start here: every interface in the system
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
├── conversation-search.ts ← keyword search across history
├── heartbeat.ts          ← proactive check-ins
├── cron.ts               ← scheduled jobs
├── thread-queue.ts       ← webhook dedup
├── virtual-fs.ts         ← read-only fs over seeded data
└── tools/
    ├── registry.ts           ← profile + policy filtering
    ├── capability-registry.ts ← fuzzy search over capabilities
    ├── code-mode.ts          ← search + execute meta-tools
    └── [9 tool files]        ← web, memory, fs, workspace, cron
```

---

## 6. demo: talk to your agent

### start the dev server

```bash
npm run dev
```

open http://localhost:3012/chat

### things to try

1. **persona selection** — "i want the blunt, no-nonsense version" (switches to ari)
2. **workspace customization** — "update my identity - i'm a backend engineer focused on distributed systems"
3. **network exploration** — "who in my network knows Rust?"
4. **memory in action** — tell the agent a preference, then in a later message see if it remembers
5. **cron jobs** — "remind me every Monday at 9am to review my connections"
6. **cross-session awareness** — open a second session (different browser), ask the agent what it's been up to

### things to notice

- the agent uses lowercase, no filler, no emojis (brand voice)
- the agent's personality changes with the persona (try switching from donna to ari)
- tool calls appear as brief status indicators while running
- the agent stays silent on heartbeat ticks when it has nothing to say

---

## 7. hands-on: improve with evals

the eval system scores the agent on 6 dimensions (0-10):

| dimension | what it measures |
|-----------|-----------------|
| coherence | does the response make sense and follow naturally? |
| persona_adherence | does the tone match the active persona? |
| tool_usage | did the agent use tools appropriately? |
| brand_voice_compliance | lowercase, no filler, concise? |
| task_completion | did the agent accomplish what the user needed? |
| memory_quality | did the agent use relevant context? |

### run the baseline

```bash
npm run eval
```

you'll see scores for 6 scenarios:

```
results:
  onboarding_persona_selection: 7.2/10
  memory_recall_preference: 6.8/10
  workspace_write_identity: 8.1/10
  filesystem_developer_search: 7.5/10
  brand_voice_compliance: 6.3/10
  cron_job_creation: 7.9/10

average: 7.3/10
```

### pick a weak spot and improve it

1. identify the lowest-scoring scenario (e.g. `brand_voice_compliance` at 6.3)
2. read the judge's reasoning in the dashboard at `/dashboard/evals`
3. find what's causing the low score — maybe the prompt isn't emphasizing brand voice enough
4. make a targeted change:
   - adjust `brand-voice.ts` rules
   - tweak the prompt builder's brand voice section
   - modify the persona overlay
5. re-run `npm run eval`
6. compare scores — did the change help? did it regress anything else?

### the eval loop

```
  ┌──────────────┐
  │  run evals   │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ read scores  │
  │ + reasoning  │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ pick lowest  │
  │   scenario   │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ make change  │──── prompt? persona? tool? memory?
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  run evals   │──── compare: did it help?
  └──────┬───────┘     did anything regress?
         │
         └───── repeat
```

this is the same loop we use in production. evals are the unit tests of agent behavior — they tell you when you've improved something and when you've broken something else.

---

## appendix: database schema

13 tables, all scoped by `tenant_id` with row-level security:

| table | rows per tenant | purpose |
|-------|----------------|---------|
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
