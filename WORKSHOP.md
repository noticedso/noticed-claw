# Multi-tenant agent architecture

a workshop by [noticed](https://noticed.so)

---

## 1. the problem

cold outreach is dying. when AI agents flood every inbox, only warm intros work - ~80% reply rate vs 5% cold. and if you're in demand, thousands of requests daily bury the best opportunities.

noticed is a personal agent that networks while you sleep. it maps your network, understands your intent, and makes warm intros on your behalf.

we've shipped noticed as a CLI, MCP server, web UI, and integrations for Telegram, iMessage and Slack. users can bring their own agent and use noticed purely as a data source.

but that's not enough. we have strong opinions about networking. if we want every user to feel like they have a personal agent - with a persona, relationship memory, and active missions - we need to give each user their own agent instance.

that's the multi-tenant problem.

---

## 2. what's an agent harness?

an agent is an LLM interacting with tools and data. the system around the LLM that facilitates that interaction is the **harness**.

Claude Code, OpenClaw, Codex, Deep Agents - these are all harnesses. the harness decides:

- how context is loaded (system prompt, workspace files, session history)
- what survives compaction and what's lost
- how long-term memory is stored, recalled, and updated
- how the agent's personality and instructions persist across sessions

---

## 3. from single-user to multi-tenant

[OpenClaw](https://github.com/open-claw) was our starting point - an open-source agent framework with workspace files, heartbeat messaging, memory with compaction, and a tool system. we tried to clone it. it broke immediately.

the reason is simple: most agent harnesses are built for **one user running one agent**. OpenClaw reads workspace files from local disk. Claude Code stores state in `~/.claude/`. Codex generates compaction summaries tied to one session.

**every component that a single-user harness handles implicitly must become an explicit, tenant-scoped subsystem:**

- **tenant isolation** - user A's memories, conversations, and workspace must be invisible to user B
- **session identity** - the same user talks on webchat, telegram, and slack. the agent needs awareness across all conversations while keeping each session's history separate
- **context economics** - memory, compaction, and embeddings cost money per user. one user's unbounded conversation can't blow your budget for everyone else
- **concurrent webhooks** - telegram sends duplicate webhooks. slack retries on timeout. you need thread-level locking so the agent doesn't respond twice
- **proactive behavior at scale** - one user's heartbeat cron is a `setInterval`. a thousand users' heartbeats are a shared automation runner that respects each tenant's timezone and active hours

---

## 4. the 7 pillars

`noticed-claw` is a self-contained implementation of a multi-tenant agent harness. everything lives under `src/lib/agent/`.

| #   | pillar         | what it owns                                   | key files                                                            |
| --- | -------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| 1   | **identity**   | prompt builder + brand voice + persona         | `prompt-builder.ts`, `brand-voice.ts`, `persona-catalog.ts`          |
| 2   | **memory**     | extract, embed, dedup, recall                  | `memory-manager.ts`, `memory-extract.ts`, `memory-flush.ts`          |
| 3   | **context**    | workspace files + session awareness + missions | `workspace-files.ts`, `session-awareness.ts`, `mission-engine.ts`    |
| 4   | **compaction** | summarize + soft-archive                       | `compaction.ts`, `conversation-search.ts`                            |
| 5   | **tools**      | registry + capability discovery + policy       | `tools/registry.ts`, `tools/capability-registry.ts`, `llm-runner.ts` |
| 6   | **sessions**   | router + session manager + thread queue        | `agent-router.ts`, `session-manager.ts`, `thread-queue.ts`           |
| 7   | **automation** | heartbeat + cron                               | `heartbeat.ts`, `cron.ts`, `tools/cron-tool.ts`                      |

the orchestration layer ties it all together in `agent-turn.ts` - it acquires the thread lock, resolves context, builds tools, runs the LLM, handles compaction and memory flush, and updates session summaries.

---

## 5. demo: talk to your agent

```bash
npm run dev
```

open http://localhost:3012/dashboard/chat

### things to try

1. **workspace customization** - "update my identity - i'm a backend engineer focused on distributed systems"
2. **network exploration** - "who in my network knows Rust?"
3. **memory in action** - tell the agent a preference, then later see if it remembers
4. **cron jobs** - "remind me every Monday at 9am to review my connections"
5. **cross-session awareness** - open a second session, ask the agent what it's been up to
6. **persona selection** - "i want the blunt, no-nonsense version" (switches to ari)

---

## 6. improve with evals

evals are how you measure whether changes to your harness actually make things better. run the baseline, make a change, run again, compare.

```bash
npm run eval
```

results are saved to `eval-results/`.
