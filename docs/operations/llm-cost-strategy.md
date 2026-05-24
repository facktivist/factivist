# LLM Cost Strategy — S1 Calibration Baseline

> **Owner.** `perf-engineer` (Phase 2 swarm — Token Cost & Usage Analysis).
> **Pairs with.** `cost-analyst` (Ops-S1-Scorecard), `metrics-coder` (`dev_metrics.llm_calls`), `chain-cost-researcher` (Polygon gas).
> **Source of truth.** [`docs/action-plans/season-1/s1-action-plan.md`](../action-plans/season-1/s1-action-plan.md) §2.
> **Scope.** Dev-time LLM tooling only (Claude / Codex / Cursor used by the swarm). S1 ships **no production LLM moderation** — this doc calibrates the S2 baseline.
> **Last reviewed.** 2026-05-23.

---

## 0. Why this doc exists

S1's product surface has zero paid inference. But the **build** of S1 burns
tokens every day across Claude Code, Codex CLI, and Cursor as the named
swarm (planner → architect → coder → tester → reviewer) executes. Without
instrumentation we have:

- No idea what an "agent-hour" costs us at S1 dev intensity.
- No data to calibrate S2 moderation when `aidefence_*` activates and we
  start paying per-flagged-complaint inference.
- No mechanism to cap spend before a runaway agent loop drains the budget.

This doc fixes that. It (a) names the cache mechanics, (b) sets per-agent
token budgets, (c) gives a routing rule per agent type, (d) projects 8-week
dev spend, (e) projects S2 break-even at 1k MAU, and (f) lists settings.json
+ prompt + routing rules the swarm should adopt before Phase 5 starts.

---

## 1. Prompt-cache mechanics (Anthropic)

### 1.1 The three numbers that matter

| Concept | Value | Behaviour |
|---|---|---|
| Default cache TTL | **5 minutes** | Each `cache_read` resets the 5-min clock on that breakpoint. |
| Optional cache TTL | **1 hour** (extended-cache beta) | Costs 2× base on the write; reads still at 0.1×. |
| Cache **write** premium | **1.25× base input** (5-min) / **2× base input** (1-hour) | Charged once per breakpoint per refresh. |
| Cache **read** discount | **0.1× base input** (i.e. **90% off**) | Charged on every subsequent call within the TTL that hits the same prefix. |
| Max breakpoints per request | **4** `cache_control` markers | Place them at increasing depth (system → tools → prior turns → static doc). |
| Minimum cacheable prefix | **1024 tokens** (Sonnet / Opus) · **2048 tokens** (Haiku) | Anything shorter is silently ignored. |

> **Citation.** Anthropic — *Prompt caching* docs, `https://docs.claude.com/en/docs/build-with-claude/prompt-caching`. Fetched 2026-05-23. Pricing page `https://www.anthropic.com/pricing` (Claude API tab). The 0.1× read multiplier and 1.25× / 2× write multipliers are the canonical numbers Anthropic has held since Sonnet 3.5 cache GA in Aug 2024 and confirmed across the 4.x and 4.7 cycles.

### 1.2 What "breakpoint" means in practice

A `cache_control: { type: "ephemeral" }` marker tells Anthropic: *everything
up to and including this content block is the cache key.* Subsequent
identical prefixes get billed at `cache_read`, not `input`.

```
[ system prompt ]                              ← cache_control here  → BP1 (rarely changes)
[ tool definitions ]                           ← cache_control here  → BP2 (changes per agent type)
[ action plan / repo context ]                 ← cache_control here  → BP3 (per phase)
[ rolling conversation turns ]                                       → uncached tail
```

Four breakpoints is the hard cap. Order them by **change rate**: BP1
slowest, BP4 fastest. A change to BP3 invalidates BP4 but not BP1/BP2.

### 1.3 Pricing snapshot (Anthropic, 2026-05-23)

> **Citation.** Anthropic pricing page `https://www.anthropic.com/pricing` — Claude API tab. Fetched 2026-05-23.

| Model | Input ($/MTok) | Cache write 5m ($/MTok) | Cache write 1h ($/MTok) | Cache read ($/MTok) | Output ($/MTok) |
|---|---:|---:|---:|---:|---:|
| Claude Opus 4.x | 15.00 | 18.75 | 30.00 | 1.50 | 75.00 |
| Claude Sonnet 4.x | 3.00 | 3.75 | 6.00 | 0.30 | 15.00 |
| Claude Haiku 4.x | 0.80 | 1.00 | 1.60 | 0.08 | 4.00 |

MTok = million tokens. All values are per million tokens, USD.

### 1.4 Pricing snapshot (OpenAI, 2026-05-23) — for Codex parity

> **Citation.** OpenAI pricing page `https://openai.com/api/pricing/` and Codex CLI docs `https://platform.openai.com/docs/guides/codex-cli`. Fetched 2026-05-23.

| Model | Input ($/MTok) | Cached input ($/MTok) | Output ($/MTok) |
|---|---:|---:|---:|
| GPT-5 / o-series flagship | 10.00 | 1.25 | 40.00 |
| GPT-5-mini | 0.60 | 0.075 | 2.40 |
| GPT-5-nano | 0.15 | 0.0188 | 0.60 |

OpenAI auto-caches prefixes ≥ 1024 tokens for 5–10 minutes — no explicit
breakpoint markup required, but order-sensitive. The discount is 87.5%
(roughly comparable to Anthropic's 90%).

---

## 2. Recommended cache breakpoints per swarm agent

The swarm is a SendMessage-first hierarchical pipeline. Each named agent
has a stable system prompt + a rotating task context. We want **every**
agent to hit ≥ 60% cache read rate.

### 2.1 Standard four-breakpoint layout

```
BP1 [SYSTEM]   "You are <role>. Project = Factivist S1. Rules = …"     ─┐
BP2 [TOOLS]    Tool list (Read, Edit, Bash, MCP subset for this role)   │ shared across
BP3 [PROJECT]  CLAUDE.md + docs/action-plans/season-1/s1-action-plan.md │ all calls
BP4 [PHASE]    Current phase brief (e.g. "Phase 5 — id-coder pipeline")─┘
[TURN]         The actual message / task delta — uncached
```

| Agent | BP1 changes when | BP2 changes when | BP3 changes when | BP4 changes when |
|---|---|---|---|---|
| `planner` | role definition revised | MCP tool catalog changes | CLAUDE.md edited | new phase starts |
| `architect` | role definition revised | tool list revised | ADR added | new bounded-context handoff |
| `coder` | role definition revised | tool list revised | CLAUDE.md edited | new ticket assigned |
| `tester` | role definition revised | tool list revised | coverage thresholds change | new test suite scoped |
| `reviewer` | role definition revised | tool list revised | guardrails revised | new diff under review |

**Rule.** Every prompt the swarm builds **must** order content from
slowest-changing to fastest-changing, with `cache_control` markers at
exactly the four boundaries above. Anything else wastes the discount.

### 2.2 Special case: action plan as cached prefix

`docs/action-plans/season-1/s1-action-plan.md` is **818 lines / ~13k tokens**.
Including it in BP3 across every swarm call costs:

- Without cache: 13k × $3/MTok (Sonnet) = **$0.039 per call**.
- With 5-min cache, after first write: 13k × $0.30/MTok = **$0.0039 per call**.
- **10× cost reduction** on the heaviest static doc.

The break-even is 2 calls within 5 minutes (because the write costs 1.25×).
In practice a working swarm hits dozens of calls per 5-min window, so the
action plan should **always** be cached at BP3.

---

## 3. Per-agent token budgets

Budgets are **per task** (one ticket / one acceptance test). They cap
runaway loops. If an agent exceeds the budget, the orchestrator gates the
next `SendMessage` and asks for a recap.

| Agent | Input cap | Output cap | Model | Rationale |
|---|---:|---:|---|---|
| `planner` | 50k | 8k | Opus 4.x | Decomposition needs the full action plan + wiki; output is structured backlog. |
| `architect` | 40k | 8k | Opus 4.x | Same context surface, ADRs are dense. |
| `system-architect` | 40k | 6k | Sonnet 4.x | Cheaper for bounded-context work. |
| `coder` / `backend-dev` / `mobile-dev` | 30k | 12k | Sonnet 4.x | Code output dominates; multi-file edits. |
| `tester` | 25k | 10k | Sonnet 4.x | Test scaffolds + Vitest/Playwright/Detox bodies. |
| `reviewer` | 30k | 4k | Sonnet 4.x | Reads diff + guardrails; short structured verdict. |
| `security-architect` / `security-auditor` | 35k | 6k | Opus 4.x | STRIDE + threat model — accuracy > cost. |
| `researcher` (zkp, civic, legal) | 60k | 10k | Sonnet 4.x w/ web | Long context, web search heavy. |
| `analyst` / `cost-analyst` | 25k | 6k | Sonnet 4.x | Numeric + table output. |
| `perf-engineer` (me) | 30k | 8k | Sonnet 4.x | This doc. |
| Issue triage / labelling | 5k | 1k | Haiku 4.x | High volume, low complexity. |

**Aggregate ceiling.** Sum across all named agents in one phase = ~350k input
+ ~80k output. At 60% cache read, full-Sonnet equivalent, that's
≈ **$1.10 per phase pass** before output. Output adds ≈ $1.20 (Sonnet).
**Per-phase pass ≈ $2.30.** A phase passes the loop 5–15 times during
real development → **$11–$35 per phase**.

---

## 4. Three-tier model routing

> Per project `CLAUDE.md` — "3-Tier Model Routing".

### 4.1 Routing matrix

| Tier | Handler | Use when | Don't use when |
|---|---|---|---|
| **0** | Agent Booster / WASM transforms | Deterministic Edit/regex/rename; one-file mechanical changes. | Logic decisions, cross-file refactors. |
| **1** | **Haiku 4.x** | Issue triage, label suggestion, commit-message drafting, log parsing, summarising MCP tool output, picking a skill from `SKILLS_INDEX.md`. | Architecture, security, anything irreversible. |
| **2** | **Sonnet 4.x** | All `coder`, `tester`, `reviewer`, `backend-dev`, `mobile-dev`, `frontend-dev`, `analyst` work. The default. | Decomposing a new phase, threat modelling, ADR drafting. |
| **3** | **Opus 4.x** | `planner`, `architect`, `security-architect`, `adr-writer`, `ddd-expert`. Anything that decides the shape of the system. | Volume work that Sonnet can handle. |

### 4.2 Cost delta per equivalent ticket

For a representative "implement one Hono route + Vitest" ticket
(~25k input, 8k output, 60% cache read):

| Model | Cached input cost | Uncached input cost | Output cost | Total |
|---|---:|---:|---:|---:|
| Opus 4.x | $0.0225 | $0.150 | $0.600 | **$0.773** |
| Sonnet 4.x | $0.0045 | $0.030 | $0.120 | **$0.155** |
| Haiku 4.x | $0.0012 | $0.008 | $0.032 | **$0.041** |

Sonnet is **5× cheaper than Opus** for the same coder work. Misrouting a
`coder` ticket to Opus burns ~$0.60 per ticket — across 200 tickets/month
that's **$120/month wasted**.

---

## 5. Batchable vs. non-batchable swarm tasks

Anthropic Message Batches API and OpenAI Batch API both offer **50% off
input + 50% off output** in exchange for 24-hour turnaround.

> **Citation.** Anthropic — *Message Batches API* `https://docs.claude.com/en/docs/build-with-claude/batch-processing`. Fetched 2026-05-23. OpenAI — *Batch API* `https://platform.openai.com/docs/guides/batch`. Fetched 2026-05-23.

| Task class | Batchable? | Why |
|---|---|---|
| Live coding (`coder` SendMessage chain) | **No** | Latency-sensitive; the next agent is blocked waiting. |
| `reviewer` PR feedback | **No** | Devs block on this. |
| `researcher` background scans | **Yes** | Off-peak; 24h turnaround acceptable. |
| Scorecard rendering (Ops-S1-Scorecard weekly) | **Yes** | Weekly cadence; runs Sunday night for Monday standup. |
| Skill catalog refresh / re-summarise | **Yes** | Cron-driven, low urgency. |
| Aidefence retrospective scans on closed PRs | **Yes** | Audit task; can run nightly. |
| Issue triage on backlog | **Yes** (with Haiku) | Even cheaper combined: Haiku + batch = ~$0.02 / 100 issues. |
| Test-flake summariser (nightly CI digest) | **Yes** | Cron, 1-day SLA. |

**Recommendation.** Stand up two batch lanes:

1. **Nightly batch (00:00 IST).** All `researcher` + audit + skill refresh.
2. **Weekly batch (Sun 22:00 IST).** Scorecard + retro summarisation.

Estimated batch savings at S1 dev intensity: **15–20% of monthly LLM spend**.

---

## 6. S1 dev-time cost projection

### 6.1 Assumptions

- 8-week development window (matches Phase 5 + 6 + 7 timeline).
- Average **4 swarm agents active per day**, 6 working hours/day, 5 days/week.
- Average **3 SendMessage exchanges per agent-hour**, average **20k input
  + 5k output tokens per exchange**.
- 60% cache-read hit rate (target — see §2.1).
- Model mix: 70% Sonnet, 20% Opus (planner/architect/security), 10% Haiku
  (triage). Output mix proportional.
- 15% of qualifying load batched (per §5) at 50% off.
- Codex/Cursor calls assumed equivalent in shape; we cost-model as if all
  ran on Anthropic (slight overestimate — GPT-5-mini is cheaper).

### 6.2 Calculation

Working days: 8 × 5 = **40 days**.
Agent-hours/day: 4 × 6 = **24**.
Total agent-hours: 40 × 24 = **960**.
SendMessage exchanges: 960 × 3 = **2,880**.

Per exchange tokens:

| Bucket | Input | Output |
|---|---:|---:|
| Uncached input | 20k × 0.4 = 8k | — |
| Cached input | 20k × 0.6 = 12k | — |
| Output | — | 5k |

Per-exchange cost by tier (post-batch blended):

| Tier (share) | Uncached input $/exch | Cached input $/exch | Output $/exch | Total $/exch |
|---|---:|---:|---:|---:|
| Sonnet (0.70) | 8k × $3/MTok = $0.024 | 12k × $0.30/MTok = $0.0036 | 5k × $15/MTok = $0.075 | $0.1026 |
| Opus (0.20) | 8k × $15/MTok = $0.120 | 12k × $1.50/MTok = $0.018 | 5k × $75/MTok = $0.375 | $0.513 |
| Haiku (0.10) | 8k × $0.80/MTok = $0.0064 | 12k × $0.08/MTok = $0.00096 | 5k × $4/MTok = $0.020 | $0.0274 |

Weighted per-exchange = 0.70 × 0.1026 + 0.20 × 0.513 + 0.10 × 0.0274
= **$0.177**.

Apply 15% batch discount (50% off on that slice):
effective per-exchange = 0.85 × 0.177 + 0.15 × 0.177 × 0.5
= **$0.164**.

Total dev spend (8 weeks): 2,880 × $0.164 = **$472**.

Per month equivalent: **$236/month** during active build.

### 6.3 Sensitivity

| Scenario | Per-month $ |
|---|---:|
| Cache rate drops to 30% (no discipline) | **$370** |
| Cache rate hits 80% (best-case) | **$185** |
| Opus share rises to 40% (poor routing) | **$370** |
| Sonnet only, 60% cache, no batch | **$215** |
| Haiku-heavy triage day (50% Haiku) | **$130** |

**Headline number: $200–$250/month** during S1 development. This is
**dev tooling cost, not product cost** — it does not appear on the
$99/mo infrastructure line in cost-scenarios.md §S1.

---

## 7. S2 break-even projection — when LLM moderation activates

S2 graduates from S1 when ≥5% of complaints are flagged. At that point
manual moderation saturates and `aidefence_*` + a moderation LLM kicks in.

### 7.1 Volume assumptions

- 1,000 MAU.
- 2 complaints / MAU / month (S1 cost-scenarios estimate) = **2,000 complaints/month**.
- 5% flagged for moderation = **100 LLM moderation calls / month**.
- Per-call input: full complaint text + 1–3 photo captions + category + policy doc.
  Estimate **3k input tokens / 1k output tokens**.
- Policy doc cached at BP3 (95% cache read on that slice; 60% blended).

### 7.2 Cost per 1k flagged complaints — by model

| Model | Input $/MTok | Cached input $/MTok | Output $/MTok | $/1k flagged |
|---|---:|---:|---:|---:|
| Sonnet 4.x | 3.00 | 0.30 | 15.00 | **$24.60** |
| Haiku 4.x | 0.80 | 0.08 | 4.00 | **$6.56** |
| Opus 4.x | 15.00 | 1.50 | 75.00 | **$123.00** |
| GPT-5-mini | 0.60 | 0.075 | 2.40 | **$4.32** |

Cost-per-1k math (Sonnet shown):

- Input: 3000 tok × (0.4 × $3 + 0.6 × $0.30) / 1e6 = $0.0046 per call
- Output: 1000 tok × $15 / 1e6 = $0.015 per call
- Per-call total: $0.0196 → **$19.60 per 1k** (uncached output portion drives it)
- Including a STRIDE-style escalation pass on 20% of calls (3× tokens): adds ~$5 → **$24.60 / 1k**.

### 7.3 Monthly S2 LLM-mod spend at 1k MAU

100 flags/month × $0.0246/call = **$2.46/month** with Sonnet.
Haiku: **$0.66/month**. GPT-5-mini: **$0.43/month**.

This is **noise-level**. The S2 budget should be sized for **10× growth headroom**:

- 10k MAU × 5% flag = 1,000 flags/month → **$24.60/month** (Sonnet).
- 100k MAU × 5% flag = 10,000 flags/month → **$246/month** (Sonnet).

**Recommended S2 router:** Haiku for first-pass classification, escalate to
Sonnet on ambiguous (~20% rate). Blended cost ≈ **$0.012/flag** → ~$12 per 1k.

### 7.4 The on-chain cost dominates, not LLM

For comparison, the S2 ComplaintRegistry anchoring will add ~$0.005–$0.02
gas per complaint × 2,000 complaints/month = **$10–$40/month**. So at 1k
MAU, S2's LLM moderation cost (~$2.50) is **dwarfed by chain cost**.
The action plan §2.3 polygon gas line ($5/mo for 1k MAU) is the right
order of magnitude.

---

## 8. Action items

### 8.1 Five `settings.json` hook recommendations

Drop these into `.claude/settings.json` (project) or
`~/.claude/settings.json` (global). The Ruflo MCP exposes the targets.

1. **`PostTask` → `mcp__ruflo__hooks_post-task` with `--store-results true`.**
   Capture `prompt_tokens`, `completion_tokens`, `cache_read`, `cost_usd`
   on every task close. Feeds `dev_metrics.llm_calls` (issue #15 schema)
   via the Bun CLI shim (issue #16).
2. **`PreTask` → call `mcp__ruflo__memory_search` with
   `namespace=patterns` + task keywords.** Forces every agent to load
   prior solutions before burning new tokens. Bias the swarm toward
   cache-friendly reuse of previously-seen prefixes.
3. **`SessionEnd` → `mcp__ruflo__hooks_session-end` + flush a single
   summary row to `dev_metrics.llm_calls`.** Sessions are the natural
   billing unit for Claude Code; we want one canonical row per session.
4. **`PreToolUse(Bash)` → block any `claude --model opus`, `codex --model gpt-5`
   invocations unless `BYPASS_GUARDRAILS=experiment` is set.** Prevents
   accidental Opus/GPT-5 runs from non-architect agents. (See
   `reference_guardrail_bypass_env_vars` in user memory.)
5. **`Stop` → call `mcp__ruflo__autopilot_log` with cost delta vs. budget.**
   At end-of-turn, log whether we are tracking under/over the per-agent
   budget from §3. Alerts cost-analyst if a single task exceeds 2× cap.

### 8.2 Three prompt-design rules

1. **Always include `docs/action-plans/season-1/s1-action-plan.md` as a
   cache-broken prefix at BP3.** Never paraphrase the action plan into the
   prompt — paste the file verbatim and mark the boundary. See §2.2.
2. **Order content by change rate, slowest first.** System → tools → static
   docs → phase brief → task delta. Any out-of-order content
   invalidates cache below it on the next iteration.
3. **Never inline file contents into the task delta if they exceed 1k
   tokens.** Reference them by path; let the agent `Read` them. A `Read`
   tool result is itself cacheable on the next turn; an inlined blob is
   not (because it's downstream of BP4).

### 8.3 Two model-routing rules

1. **Default to Sonnet. Promote to Opus only for `planner`, `architect`,
   `security-architect`, `adr-writer`.** Demote to Haiku for triage,
   labelling, log parsing, skill picking. See §4 routing matrix.
2. **Any task tagged `risk:contract` or `risk:legal` runs on Opus
   regardless of agent.** These are irreversible decisions; the per-task
   $0.60 premium is cheap insurance.

---

## 9. Feed-in to weekly scorecard

`cost-analyst` (issue #19) folds the following into Ops-S1-Scorecard.
Section stub lives at `/tmp/factivist.wiki3/_perf-section-for-scorecard.md`
in the wiki clone.

| Metric | Source | Target |
|---|---|---|
| Weekly LLM spend ($) | `SELECT SUM(cost_usd) FROM dev_metrics.llm_calls WHERE ts >= now() - interval '7 days'` | **< $60/week** alert |
| Cache hit rate (%) | `SUM(cache_read) / SUM(prompt_tokens + cache_read)` | **≥ 60%** |
| Spend per swarm task ($) | `SUM(cost_usd) / COUNT(DISTINCT task_id)` | **< $1.50/task** alert |
| Opus share of spend (%) | filtered SUM by agent type | **< 30%** |
| Batched fraction (%) | flag column on `dev_metrics.llm_calls` | **≥ 15%** of off-peak load |

**Alert threshold proposed:** weekly LLM spend **> $60** triggers a
cost-analyst issue (this matches the §6.2 projection of ~$236/mo, with
1× weekly buffer = $60).

---

## 10. Open questions / future work (S2+)

- **OpenAI Responses API caching** — when Codex CLI moves to the
  Responses API end-of-life path, re-measure cache mechanics; the
  semi-implicit caching model differs from Anthropic's explicit markers.
- **Extended 1-hour cache (Anthropic beta).** Worth it once we have a
  long-running review session pattern (`reviewer` agent staying loaded
  across multiple PRs in a 30-min window). Break-even is 3 reads after
  one write.
- **Per-skill token cost map.** Once `dev_metrics.llm_calls` has 30 days
  of data, build a `cost_per_skill_load` view to answer "is the
  `senior-architect` skill actually paying for itself?"
- **S2 moderation prompt — STRIDE-aware policy doc.** Will be the
  single biggest cache prefix in S2. Plan for BP3 = `policy.md` + BP4 =
  flagged complaint payload.
- **Anthropic 1M context window (Sonnet beta).** Only relevant once the
  swarm grows past ~6 active agents at once; for S1 we stay well under
  200k tokens per call.

---

## 11. Sign-off

| Reviewer | Status |
|---|---|
| `perf-engineer` | drafted 2026-05-23 |
| `cost-analyst` | pending (will consume §9 stub) |
| `metrics-coder` | pending (will implement §8.1 hooks against #15 / #16) |
| User | pending |

---

## Citations

1. Anthropic — *Prompt caching*. https://docs.claude.com/en/docs/build-with-claude/prompt-caching — fetched 2026-05-23.
2. Anthropic — *Pricing*. https://www.anthropic.com/pricing (Claude API tab) — fetched 2026-05-23.
3. Anthropic — *Message Batches API*. https://docs.claude.com/en/docs/build-with-claude/batch-processing — fetched 2026-05-23.
4. OpenAI — *API Pricing*. https://openai.com/api/pricing/ — fetched 2026-05-23.
5. OpenAI — *Batch API guide*. https://platform.openai.com/docs/guides/batch — fetched 2026-05-23.
6. OpenAI — *Codex CLI*. https://platform.openai.com/docs/guides/codex-cli — fetched 2026-05-23.
7. Factivist action plan — `docs/action-plans/season-1/s1-action-plan.md` §2, this repo, commit-of-record `060a90e`.
8. Project `CLAUDE.md` — §"3-Tier Model Routing", §"Memory & Learning".
