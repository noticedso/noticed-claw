# noticed-claw

a multi-tenant agent workshop built on [noticed](https://noticed.so)'s production architecture.

68 source files. 29 test files. 197 tests. 10 eval scenarios. one `npm run dev` to start.

## what is this

a self-contained Next.js app that teaches multi-tenant agent architecture — the kind that runs independent AI agent instances for thousands of users on shared infrastructure.

each user gets their own persona, memory, workspace files, scheduled jobs, and conversation history. all isolated by tenant, all on one deployment.

built for the workshop: **"Cloning OpenClaw to run in the cloud for thousands of users"**

see [WORKSHOP.md](WORKSHOP.md) for the full guide.

## quick start

```bash
# 1. install
npm install

# 2. start local supabase (requires docker)
supabase start

# 3. run database migrations
for f in src/supabase/migrations/*.sql; do
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f "$f"
done

# 4. seed 100 developer profiles
npm run seed

# 5. copy env and fill in keys
cp .env.example .env
# fill in supabase keys (from `supabase status`) and OPENAI_API_KEY

# 6. start dev server
npm run dev
```

open http://localhost:3012 — sign up, then chat.

## what's inside

```
src/
├── app/
│   ├── api/
│   │   ├── chat/            streaming chat endpoint (AI SDK useChat)
│   │   ├── sessions/        session CRUD + message history
│   │   ├── webhook/         platform adapters (telegram, slack)
│   │   ├── agent-cron/      heartbeat + cron tick
│   │   └── eval/            eval runner endpoint
│   ├── dashboard/
│   │   ├── chat/            webchat with session selector
│   │   ├── developers/      browse 100 seeded profiles
│   │   ├── evals/           eval runs + per-scenario detail
│   │   └── tenants/[id]/    sessions, messages, memories, missions,
│   │                        workspace, cron, tools
│   └── login/               email/password auth
├── lib/agent/
│   ├── agent-turn.ts        turn orchestration (non-streaming)
│   ├── stream-bridge.ts     streaming with silent-token buffering
│   ├── agent-router.ts      tenant + session resolution
│   ├── prompt-builder.ts    system prompt assembly (9 sections)
│   ├── llm-runner.ts        tool-call loop via AI SDK generateText
│   ├── memory-extract.ts    LLM-based fact extraction per turn
│   ├── memory-flush.ts      pre-compaction memory preservation
│   ├── memory-manager.ts    cosine dedup, pgvector recall
│   ├── compaction.ts        token threshold, chunked summarization
│   ├── brand-voice.ts       immutable style rules
│   ├── persona-catalog.ts   ari / donna / ted
│   ├── workspace-files.ts   7 per-tenant .md files
│   ├── mission-engine.ts    onboarding → audience → outreach
│   ├── session-awareness.ts cross-session context
│   ├── heartbeat.ts         timezone-aware proactive check-ins
│   ├── cron.ts              at / every / cron scheduling
│   ├── virtual-fs.ts        read-only fs over seeded data
│   ├── thread-queue.ts      webhook dedup via advisory locks
│   └── tools/               9 built-in tools + code mode
├── eval/
│   ├── cli.ts               npm run eval (+ CSV output)
│   ├── runner.ts            create tenant, play turns, judge, cleanup
│   ├── judge.ts             6-dimension LLM scoring
│   └── scenarios/           10 YAML eval scenarios
└── supabase/
    ├── client.ts            browser + service role clients
    ├── auth-client.ts       cookie-based auth (server only)
    ├── seed.ts              100 developer profiles with embeddings
    └── migrations/          14 SQL files (13 tables + RLS)
```

## commands

| command | what it does |
|---------|-------------|
| `npm run dev` | start dev server on :3012 |
| `npm run build` | production build |
| `npm run test` | run 197 vitest tests |
| `npm run lint` | eslint with 4 architecture rules |
| `npm run seed` | seed 100 developer profiles |
| `npm run eval` | run 10 eval scenarios, output CSV |

## architecture

two meta-tools (search + execute) give the LLM access to 9 capabilities without paying the context cost of 9 tool definitions on every turn.

```
user message
  → agent-router (resolve tenant + session)
  → prompt-builder (identity + brand voice + persona + tools + memory + workspace)
  → LLM with search/execute tools
  → post-turn hooks (memory extraction, compaction check, session summary)
```

every query is scoped by `tenant_id` via Supabase RLS. one deployment, many agents.

## eval system

```bash
npm run eval
```

scores 10 scenarios across 6 dimensions (0-10):
coherence, persona adherence, tool usage, brand voice compliance, task completion, memory quality.

outputs CSV to `eval-results/` for comparison across runs.

we went from 5.8 to 8.2 average in 4 iterations — see [WORKSHOP.md](WORKSHOP.md#7-improve-with-evals) for the full walkthrough.

## tech stack

- **Next.js 15** (App Router, Turbopack)
- **Supabase** (Postgres, pgvector, RLS, auth)
- **AI SDK** (`ai` + `@ai-sdk/openai`) — provider-agnostic LLM + embeddings
- **Vitest** — unit + integration tests
- **Tailwind CSS** — dashboard styling
- **ESLint** — 4 custom architecture enforcement rules

## license

MIT
