# Multi-tenant agent architecture

a workshop by [noticed](https://noticed.so)

---

## 1. what is noticed

cold outreach is dead - when AI agents flood every inbox, only warm intros work (~80% reply rate vs 5% cold). and if you're in demand, thousands of requests daily bury the best opportunities.

artists have agents. athletes have agents. who represents founders, builders, operators, investors?

**noticed is a personal agent that networks while you sleep.**

- **maps your network** - combines public data (GitHub, LinkedIn) with private context (conversations, meeting notes) to find warm paths
- **understands your intent** - lives in your messaging apps, learns what you're looking for (fundraising, hiring, partnerships)
- **makes the move** - makes the warm intro, follows through, only brings you in when it's needed

---

## 2. why are we building an agent harness?

we've built noticed as a CLI, MCP, web UI and integrated into Telegram, iMessage and Slack. this means you can bring your own Agent and use noticed as a data source and search engine only.

but here's the catch:

we have really strong opinions on what's wrong and right with networking. if we want to coin the term **vibe networking** we need to make noticed sticky. and to do that, we need to give every user gets their own networking agent with a a persona, relationship memory and missions.

that's the multi-tenant problem we're solving today.

### what's an agent harness?

an agent is an LLM interacting with tools and data. the system around the LLM that facilitates that interaction is the **harness**. Claude Code, OpenClaw, Codex, Deep Agents - these are all harnesses.

the harness decides:

- how context is loaded (system prompt, workspace files, session history)
- what survives compaction and what's lost
- how long-term memory is stored, recalled, and updated
- how the agent's personality and instructions persist across sessions

---

## 3. the OpenClaw story

`noticed-claw` is an ode to our early attempt at cloning OpenClaw.

[OpenClaw](https://github.com/open-claw) - an open-source personal agent framework with workspace files, heartbeat messaging, memory with compaction, and a tool system.

most agent harnesses are built for **one user running one agent**. OpenClaw reads workspace files from local disk. Claude Code stores state in `~/.claude/`. Codex generates encrypted compaction summaries tied to one session.

**every component that a single-user harness handles implicitly must become an explicit, tenant-scoped subsystem.**

**tenant isolation.** user A's memories, conversations, and workspace must be invisible to user B. row-level security on every table.

**session identity.** the same user talks to your agent on webchat, telegram, and slack. the agent needs to know about all its conversations - but keep each session's history separate.

**context economics.** memory, compaction, and embeddings cost money per user. one user's unbounded conversation can't blow your budget for everyone else.

**concurrent webhooks.** telegram sends duplicate webhooks. slack retries on timeout. you need thread-level locking so the agent doesn't respond twice to the same message.

**proactive behavior at scale.** one user's heartbeat cron is a `setInterval`. a thousand users' heartbeats are a shared automation runner that respects each tenant's timezone and active hours.

---

## 5. noticed-claw

this repo is a self-contained implementation of a multi-tenant agent harness

### the 8 building blocks

| #   | block                     | what it does                                              | single → multi-tenant challenge             |
| --- | ------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| 1   | **tenant isolation**      | RLS policies scope every query by `tenant_id`             | doesn't exist in single-tenant              |
| 2   | **session management**    | composite key: `tenant:channel:chatType:peerId`           | single-tenant has one implicit session      |
| 3   | **persona + brand voice** | immutable brand rules + swappable persona per tenant      | single-tenant has one hardcoded personality |
| 4   | **semantic memory**       | two-tier (daily/curated) with pgvector embeddings + dedup | single-tenant uses flat files               |
| 5   | **context compaction**    | summarize when tokens > 48k, soft-archive messages        | single-tenant has no cost pressure          |
| 6   | **tool policy engine**    | profile levels (minimal/standard/full) + allow/deny       | single-tenant exposes all tools             |
| 7   | **code mode**             | 2 meta-tools (search + execute) over capability registry  | single-tenant sends all tools every turn    |
| 8   | **proactive automation**  | heartbeat + cron with timezone-aware active hours         | single-tenant uses local cron               |

---

## 6. demo: talk to your agent

```bash
npm run dev
```

open http://localhost:3012/chat

### things to try

1. **workspace customization** - "update my identity - i'm a backend engineer focused on distributed systems"
2. **network exploration** - "who in my network knows Rust?"
3. **memory in action** - tell the agent a preference, then later see if it remembers
4. **cron jobs** - "remind me every Monday at 9am to review my connections"
5. **cross-session awareness** - open a second session, ask the agent what it's been up to
6. **persona selection** - "i want the blunt, no-nonsense version" (switches to ari)

---

## 7. improve with evals

evals are the single best way to improve your agent harness.

### run the baseline

```bash
npm run eval
```

each run outputs scores to the terminal AND saves a CSV to `eval-results/`
