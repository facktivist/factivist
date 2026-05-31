# Factivist — S1 Verifiable Lean MVP — Action Plan

> **Scope:** Execute the **S1** scenario from
> [`docs/product/cost-scenarios.md`](../../product/cost-scenarios.md) against the
> vision in [`docs/product/product-vison.md`](../../product/product-vison.md).
>
> **Budget:** ≈ $100/mo (pilot 1k MAU) · $3–10k one-time (single-contract audit).
>
> **Outcome:** Production web + Android + iOS app where every contributor is a
> ZKP-verified unique Indian citizen (`CitizenVerifier.sol` on Polygon PoS),
> can submit a text + 1–3 photo complaint tagged by category + constituency,
> and the public can browse / filter / comment. Manual moderation. No
> `ComplaintRegistry` anchoring yet (that is S2).

---

## Tooling Choices (canonical)

| Concern | Tool | Notes |
|---------|------|-------|
| Planning, backlog, sprint board | **GitHub Projects** (v2) | Single source of truth for epics → stories → tasks; no Linear / Jira / Trello. Backlog from Phase 1 lives here. |
| Research notes & briefs | **GitHub Wiki** (on this repo) | All research deliverables (anoncitizen, constituency dataset, IT Act posture, Polygon gas, etc.) are wiki pages, not `docs/research/*.md`. |
| Design (flows, IA, hi-fi screens) | **Claude Design** | Replaces Figma for S1. Exports live in the repo under `design/`; Claude Design URLs linked from GitHub Projects cards. |
| Deployment + CI/CD | **GitHub Actions** | Every workflow under `.github/workflows/`. No CircleCI, no Travis, no Buildkite. Staging + production deploys are tag- and approval-gated Actions runs. |

Everything else (Ruflo memory, Bun, Drizzle, Supabase, Polygon, EAS) is unchanged from the project stack.

---

## 0. Operating Model — Ruflo + SendMessage-First Swarm

Every phase below is executed by a **named swarm** that coordinates via
`SendMessage`, not polling. The lead agent (you) spawns the team in **one
message** with `run_in_background: true`, then stops and waits.

### 0.1 Swarm bootstrap (run once at the start of each phase)

```bash
npx ruflo@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
npx ruflo@latest memory search --query "<phase keywords>" --namespace patterns
npx ruflo@latest hooks route --task "<phase description>"
```

### 0.2 Memory contract

| Moment | Command |
|--------|---------|
| Before phase | `memory search --namespace patterns --query "<topic>"` |
| After phase success | `memory store --namespace patterns --key "s1-<phase>-<topic>" --value "<what worked>"` |
| After phase | `hooks post-task --task-id "s1-<phase>" --success true --store-results true` |

### 0.3 Standing background workers (Ruflo)

| Worker | Trigger |
|--------|---------|
| `audit` | After any security-relevant PR (ZKP, smart contract, auth) |
| `testgaps` | After every feature merge — must keep ≥95% coverage |
| `map` | Every 5+ file change PR |
| `document` | After API surface change |

```bash
npx ruflo@latest hooks worker dispatch --trigger <name>
```

---

## Phase 1 — Project Research & Planning

**Goal:** Lock the S1 scope, identify all unknowns, and produce a unit-of-work
backlog the swarm can execute against.

### 1.1 Swarm

| Role | Agent type | Name | Responsibility |
|------|-----------|------|----------------|
| Lead | `planner` | `planner` | Decompose S1 into epics → stories → tasks |
| Research — Identity | `researcher` | `zkp-researcher` | anoncitizen circuits, nullifier semantics, Polygon ZKP gas |
| Research — Civic data | `researcher` | `civic-researcher` | Constituency dataset (ECI delimitation), 36 category taxonomy, PIN-to-constituency mapping |
| Research — Legal | `researcher` | `legal-researcher` | IT Act 2000 intermediary safe-harbour, IT Rules 2021 obligations for hosting outside India |
| Specification | `specification` | `spec-writer` | Convert findings into testable acceptance criteria |

### 1.2 Skills to load

- `research` (default research router)
- `dossier` (entity/category research)
- `pulse` (sentiment & current civic-tech landscape in India)
- `code-to-prd` (turn findings into a PRD)
- `spec-driven-workflow`
- `senior-prompt-engineer` (for moderation queue prompt design even in manual phase)

### 1.3 Deliverables

**Planning lives in GitHub Projects.** Create a single Project (v2) named
`Factivist — S1 Verifiable Lean MVP` with the views:

- `Board` — Backlog · In Progress · In Review · Blocked · Done
- `By Phase` — grouped by `Phase 1` … `Phase 8`
- `By Agent` — grouped by the named swarm agent owning the issue
- `Risk` — filtered to `risk:contract`, `risk:privacy`, `risk:legal`

Required custom fields: `Phase`, `Owner Agent`, `Story Points`, `Acceptance
Test ID`, `Risk`. The Phase 1 backlog (≤ 1 day stories) is created as issues
in this Project — there is **no** `s1-backlog.csv` file.

**Research lives in the GitHub Wiki** on this repo. Required pages:

1. `S1-PRD` — single-page PRD per the 8 S1 features.
2. `Research-Anoncitizen-ZKP` — anoncitizen integration brief (nullifier formula,
   on-chain verify gas, mobile feasibility).
3. `Research-Constituency-Dataset` — chosen source, licence, refresh strategy,
   schema.
4. `Research-IT-Act-Posture` — intermediary safe-harbour + IT Rules 2021
   obligations for hosting outside India.
5. `Glossary` — terms shared by all research pages (nullifier, citizen
   credential, constituency, etc.).

Each Wiki page links back to its tracking issue in the Project and stores a
`[[memory-key]]` line so Ruflo can cross-reference. No research briefs are
written to `docs/research/*.md`.

**Updated `MEMORY.md` index** with `[[s1-zkp-findings]]`,
`[[s1-constituency-source]]`, `[[s1-it-act-posture]]` — each pointing to its
Wiki URL.

### 1.4 Exit gate

- [ ] PRD wiki page signed off by the user
- [ ] GitHub Project has ≥ 95% of stories tagged with `Owner Agent` +
      `Acceptance Test ID` custom fields filled
- [ ] All four research Wiki pages published and cross-linked to their
      Project issues
- [ ] `ruflo memory search --namespace patterns --query "factivist s1"` returns
      non-empty results

---

## Phase 2 — Token Cost & Usage Analysis (LLM + Chain)

**Goal:** Even though S1 has **no LLM moderation**, we must instrument the
manual-moderation queue and the few LLM touch-points (planning, code-gen) so
that S2's automated moderation has a calibrated baseline.

### 2.1 Swarm

| Role | Agent | Name | Responsibility |
|------|-------|------|----------------|
| Lead | `analyst` | `cost-analyst` | Model usage forecast, dashboards |
| Performance | `performance-engineer` | `perf-engineer` | Token-cost optimisation (Flash Attention, caching, batch) |
| Coder | `coder` | `metrics-coder` | Wire `aidefence_*` MCP scanners + token usage hooks |
| Chain cost | `researcher` | `chain-cost-researcher` | Polygon PoS gas math for ZKP verify call, batching headroom |

### 2.2 Skills

- `analysis:token-usage`
- `analysis:token-efficiency`
- `analysis:performance-bottlenecks`
- `claude-api` (cache-hit-rate setup for any internal LLM tooling)
- `tech-stack-evaluator`

### 2.3 Concrete tasks

- [ ] Stand up a single Postgres table `dev_metrics.llm_calls` capturing
      `agent`, `prompt_tokens`, `completion_tokens`, `cache_read`, `cost_usd`,
      `task_id`, `ts`. Even at S1, every dev-time LLM call (Claude/Codex/Cursor)
      should log here via a thin Bun CLI shim.
- [ ] Estimate **on-chain cost** of one ZKP verify call on Polygon PoS:
      `(gas_used × gas_price_gwei × matic_usd)`. Confirm `≈ $0.005–$0.02`
      claim in cost-scenarios §S1.
- [ ] Build a **5-row scorecard** updated weekly:
      `verified_citizens`, `complaints`, `mod_queue_depth`, `polygon_spend_usd`,
      `infra_spend_usd`.
- [ ] **No paid LLM moderation** in S1; the analyst confirms the manual queue
      is sized correctly: assume **5% of complaints flagged** (per S1 graduate
      threshold) × estimated complaint volume → moderator-hours/week.

### 2.4 Exit gate

- [ ] `dev_metrics.llm_calls` populated for ≥ 7 days of development
- [ ] Polygon verify gas measured live on Amoy testnet, reconciled with mainnet
      gas oracle, recorded on the **GitHub Wiki page `Research-Polygon-Gas`**
- [ ] Weekly scorecard rendered via `mcp__claude_ai_Ahrefs__render-scorecard`
      or equivalent and posted to the **GitHub Wiki page `Ops-S1-Scorecard`**,
      with a tracking issue on the GitHub Project updated weekly

---

## Phase 3 — Project Design (UX + Information Architecture)

**Goal:** Design the **9 user-facing surfaces** that ship in S1.

### 3.1 The 9 S1 surfaces

1. Onboarding + anoncitizen ZKP verification (web + mobile)
2. Complaint composer (text + 1–3 photos + category + constituency)
3. Complaint detail (read, comment, flag)
4. Browse / filter by state → district → constituency
5. Postgres full-text search results
6. Citizen profile (anonymous handle, count of complaints, no PII)
7. Moderation queue (admin-only, NOT public)
8. Static legal pages (ToS, privacy, ZKP explainer)
9. App-shell mobile screens with offline-friendly skeletons

### 3.2 Swarm

| Role | Agent | Name | Responsibility |
|------|-------|------|----------------|
| Lead | `ux-researcher-designer` (skill-backed) | `ux-lead` | Flows, IA, mobile-first |
| HIG / Material | `apple-hig-expert` + `building-native-ui` (skills) | `mobile-designer` | Native parity |
| Component | `base-template-generator` | `ui-templater` | HeroUI v3 + HeroUI Native compound components |
| Accessibility | (a11y-audit skill) | `a11y-auditor` | WCAG 2.2 AA gate |

### 3.3 Skills

- `ui-design-system`
- `apple-hig-expert`
- `building-native-ui`
- `heroui-react`, `heroui-native`, `heroui-migration`
- `uniwind` (Tailwind v4 in React Native)
- `tailwind-4-docs`
- `frontend-design:frontend-design`
- `a11y-audit`

### 3.4 Deliverables

- **Claude Design** project with the 9 surfaces (low → high fidelity). No
  Figma in S1. Each surface has its Claude Design share URL pinned to the
  matching GitHub Project issue.
- Static exports (PNG / SVG) of each surface checked into `design/s1/` for
  offline review and PR previews.
- `packages/ui/theme` tokens locked (oklch primitives + semantic), generated
  from the Claude Design token sheet.
- HeroUI compound-component map: `Complaint.Composer`, `Complaint.Card`,
  `Filter.ConstituencyTree`, `Onboarding.VerifyStep` etc.
- a11y baseline report (axe-core), zero **serious** or **critical** violations.

### 3.5 Exit gate

- [ ] All 9 surfaces designed to high fidelity in **Claude Design** for
      **web** and **mobile**
- [ ] Claude Design share URLs attached to every Phase 3 issue in the
      GitHub Project
- [ ] HeroUI compound naming reviewed by the user
- [ ] a11y baseline at zero `serious`/`critical`

---

## Phase 4 — Project Architecture

**Goal:** Lock the bounded contexts, packages, and contracts so that
Development can run in parallel without integration friction.

### 4.1 Swarm

| Role | Agent | Name | Responsibility |
|------|-------|------|----------------|
| Lead | `system-architect` | `architect` | Bounded contexts, package map |
| ADR | `adr-architect` | `adr-writer` | Capture each decision as an ADR with `[[link]]`s |
| DDD | `ddd-domain-expert` | `ddd-expert` | Aggregates (Complaint, Citizen, Constituency, Comment, ModerationItem) |
| Security | `security-architect` | `sec-architect` | Threat model, key custody, ZKP key handling |
| Data | `database-designer` (skill) | `db-architect` | Drizzle schema + Apache AGE graph |

### 4.2 Skills

- `senior-architect`
- `senior-security`
- `database-schema-designer`
- `drizzle-best-practices`
- `supabase-postgres-best-practices`
- `supabase`
- `zod`
- `hono`
- `monorepo-navigator`
- `turborepo`

### 4.3 Architectural decisions to ratify (one ADR each)

| ADR | Decision |
|-----|----------|
| ADR-001 | Drizzle as the **only** DB access path. No raw SQL. No Prisma. |
| ADR-002 | Zod schemas live in `packages/shared`, validate **both** client and server. |
| ADR-003 | `CitizenVerifier.sol` is the **only** smart contract in S1. Forked from anoncitizen reference, audited as integration glue. |
| ADR-004 | Supabase Storage for photos. No IPFS until S2. EXIF stripping is mandatory **server-side**. |
| ADR-005 | Postgres full-text search via `tsvector` + GIN index. No Meilisearch until S3. |
| ADR-006 | Manual moderation queue is a Postgres table, not Redis/Bull. No queue infra in S1. |
| ADR-007 | Constituency hierarchy is a **closed reference dataset** loaded via Drizzle migration seed. |
| ADR-008 | Mobile = single Expo + Expo Router codebase; Android + iOS share 100% of business logic. |
| ADR-009 | All API endpoints behind Supabase custom domain (India ISP mitigation). |
| ADR-010 | Citizen anonymity floor: never write national-ID, name, address, photo of citizen to **any** store. Nullifier only. |

### 4.4 Bounded contexts (S1)

```
identity/        — ZKP verification, citizen credential, nullifier set
complaint/       — composition, persistence, retrieval
moderation/      — queue, decisions, audit trail
discovery/       — browse, filter, FTS
geo/             — state/district/constituency reference + PIN lookup
comment/         — threaded, manual-mod
admin/           — operator-only UI
```

Mapped onto `packages/` and `apps/` per the existing monorepo:

```
apps/web/src/features/{identity,complaint,discovery,comment,admin}
apps/mobile/src/features/{identity,complaint,discovery,comment}
apps/api/src/routes/{identity,complaint,discovery,comment,moderation,admin}
packages/shared/{schemas,types,constants}/{identity,complaint,geo,comment,moderation}
packages/db/schema/{citizens,complaints,categories,constituencies,comments,moderation_queue}
packages/ui/web/{Complaint,Filter,Onboarding,...}
packages/ui/native/{Complaint,Filter,Onboarding,...}
```

### 4.5 Deliverables

- 10 ADRs under `docs/adr/00xx-*.md`.
- `docs/architecture/s1-c4.md` — Context + Container + Component diagrams.
- `docs/architecture/threat-model.md` — STRIDE pass over identity + complaint
  flow.
- Final Drizzle schema in `packages/db/schema/` (no code yet — schema only).

### 4.6 Exit gate

- [ ] 10 ADRs accepted
- [ ] Threat model reviewed by `senior-security` skill
- [ ] Drizzle schema compiles (`bun run db:generate` produces clean diff)

---

## Phase 5 — Development

**Goal:** Ship the S1 feature set behind feature flags, end-to-end, on
mainnet-equivalent infra.

### 5.1 Workstreams & swarms

Run as **three parallel pipelines** (fan-out from `planner`), each itself a
sequential SendMessage chain.

#### A. Identity & ZKP

```javascript
// All in ONE message
Agent({ name: "id-researcher", subagent_type: "researcher",
        prompt: "anoncitizen wiring on Polygon PoS. SendMessage to 'id-architect'.",
        run_in_background: true })
Agent({ name: "id-architect", subagent_type: "system-architect",
        prompt: "Wait for 'id-researcher'. Design Citizen aggregate + verifier glue. SendMessage to 'id-coder'.",
        run_in_background: true })
Agent({ name: "id-coder", subagent_type: "coder",
        prompt: "Wait for 'id-architect'. Implement `apps/api/src/routes/identity`, ZKP client in `apps/web` + `apps/mobile`. SendMessage to 'id-tester'.",
        run_in_background: true })
Agent({ name: "id-tester", subagent_type: "tester",
        prompt: "Wait for 'id-coder'. Write contract + integration tests, 95% coverage. SendMessage to 'id-reviewer'.",
        run_in_background: true })
Agent({ name: "id-reviewer", subagent_type: "reviewer",
        prompt: "Wait for 'id-tester'. Security + correctness review. Block on PII leakage.",
        run_in_background: true })
```

Stack: `@anoncitizen/core`, `@anoncitizen/react`, `@anoncitizen/contracts`,
`snarkjs`, `ethers v6`, Drizzle (`citizens` table holds **only** nullifier +
state/district code + `created_at`).

#### B. Complaint + Geo + Discovery

| Step | Agent | Output |
|------|-------|--------|
| 1 | `backend-dev` | `apps/api/src/routes/complaint`, `apps/api/src/routes/discovery`, Zod request/response in `packages/shared` |
| 2 | `coder` | `apps/web/src/features/complaint`, `apps/mobile/src/features/complaint` |
| 3 | `mobile-dev` | Camera + photo picker + tus-resumable upload via Supabase Storage |
| 4 | `tester` | Vitest + Playwright + Detox |
| 5 | `reviewer` | Bias check on category taxonomy, PII scrub on uploads |

Stack: HeroUI v3 (web), HeroUI Native (mobile), TanStack Query (server state),
Zustand (client state), React Hook Form + Zod (forms), Sharp (server-side EXIF
strip — even though S1 keeps storage on Supabase, EXIF strip is **non-negotiable**).

#### C. Moderation Queue + Comments + Admin

| Step | Agent | Output |
|------|-------|--------|
| 1 | `backend-dev` | `moderation_queue` table, `/admin/moderation` API |
| 2 | `coder` | Admin web UI (server components, auth-gated) |
| 3 | `tester` | RBAC tests, queue invariants |
| 4 | `security-auditor` | Verify mod-queue operator cannot deanonymize citizens |

### 5.2 Skills to keep loaded for development

- `senior-backend`, `senior-frontend`, `senior-fullstack`
- `next-best-practices`, `next-cache-components`
- `react-native-best-practices`, `argent-react-native-app-workflow`
- `expo-dev-client`, `expo-deployment`, `expo-tailwind-setup`
- `drizzle-best-practices`, `supabase`, `zod`, `hono`, `bun`, `turborepo`
- `tdd-guide` (informs Phase 6 too)
- `biome-developer`

### 5.3 Hard rules during development

- Bun **only**. No `npm` / `yarn` / `pnpm` (per project `CLAUDE.md`).
- TypeScript strict. No `any`. No `@ts-ignore`.
- Zod schemas in `packages/shared/` validate **client and server**.
- Server Components by default in Next.js 16; `"use client"` only when needed.
- Mobile: HeroUI Native + Uniwind. NativeWind migrations forbidden.
- **EXIF / GPS strip mandatory server-side** before any photo lands in Storage.
- Every PR runs `bun run check` (lint → test:coverage → build) and the
  `aidefence_scan` MCP tool on the diff.

### 5.4 Feature flags

S1 ships with two flags:
- `S1_PUBLIC_BROWSE` — gates public read access (off until moderation queue
  is staffed).
- `S1_COMPLAINT_SUBMIT` — gates write path.

Use a single Postgres `feature_flags` row read by both web and api. Don't add
GrowthBook / LaunchDarkly — overkill for S1.

### 5.5 Exit gate

- [ ] All three pipelines green on main — pending first-merge CI run (Phase 9 Group A1)
- [x] `bun run check` passes — 38/38 every commit since wave 3 (`pattern_s1_phase_5_done`)
- [x] `aidefence_scan` shows no medium+ findings on the cumulative diff — closed by wave-1 review (`pattern_s1_phase_5_wave_1_done`)
- [x] `ruflo doctor --fix` reports clean — closed wave 1

---

## Phase 6 — Testing (TDD-First)

**Goal:** Hit the project's enforced **≥ 95% lines / ≥ 95% functions / ≥ 95%
statements / ≥ 90% branches** thresholds with TDD on every new file.

### 6.1 Swarm

| Role | Agent | Name | Responsibility |
|------|-------|------|----------------|
| Lead | `tester` | `qa-lead` | Coverage + TDD policy enforcement |
| TDD specialist | `tdd-london-swarm` | `tdd-london` | Mock-driven outside-in on new features |
| E2E web | `tester` | `playwright-eng` | Playwright on `apps/web/e2e/*.spec.ts` |
| E2E mobile | `tester` | `detox-eng` | Detox on `apps/mobile/e2e/*.spec.ts` |
| Smart contract | `tester` | `contract-tester` | Hardhat + chai matchers for `CitizenVerifier` integration glue |
| Validation | `production-validator` | `prod-validator` | Block release if anything below the bar |

### 6.2 Skills

- `tdd-guide`
- `senior-qa`
- `vitest`, `vitest-skill`, `jest-skill`
- `playwright-cli`, `playwright-pro`, `playwright-skill`,
  `playwright-generate-test`, `playwright-automation-fill-in-form`
- `detox-skill`
- `coverage`
- `api-test-suite-builder`
- `cross-eval` (for AI-touching code — relevant in S2 but wired now)

### 6.3 TDD loop

Per ticket:

1. `qa-lead` writes the **failing acceptance test** first (Vitest/Playwright/Detox).
2. Coder agent receives the failing test via `SendMessage`, implements
   smallest change to pass.
3. `qa-lead` runs `bun run test:coverage`; if any threshold under, send back.
4. Loop until green; then `reviewer` agent gates merge.

### 6.4 Test inventory for S1

| Suite | Where | Min count |
|-------|-------|-----------|
| Identity / ZKP integration | `apps/api/__tests__/identity/*.test.ts` | 12 |
| Complaint API | `apps/api/__tests__/complaint/*.test.ts` | 15 |
| Discovery / FTS | `apps/api/__tests__/discovery/*.test.ts` | 8 |
| Moderation queue | `apps/api/__tests__/moderation/*.test.ts` | 8 |
| Web E2E | `apps/web/e2e/*.spec.ts` — onboarding, submit (complaint), browse, flag, tab-parity (ADR-0019) | 5 |
| Mobile E2E (iOS) | `apps/mobile/e2e/*.spec.ts` via Detox + Argent MCP | 5 |
| Mobile E2E (Android) | same files, Detox android config | 5 |
| Contract glue | `packages/contracts/test/CitizenVerifier.t.ts` | **DEFERRED to Phase 9** ([[s1-zkp-findings]] OQ-1 — upstream Polygon deployment) |
| Schema / Zod | `packages/shared/__tests__/*.test.ts` | 20 |

**Phase 6 amendments** (per qa-lead gap analysis 2026-05-24):
- Row 5 swapped `comment` → `tab-parity (ADR-0019)`. Comments table is out of S1 scope ([[s1-phase-5-done]] wave-4 nice-to-have #5).
- Row 8 (Contract glue) moved to Phase 9 — `packages/contracts/` doesn't exist and the upstream `CitizenVerifier` deployment doesn't exist yet. See `docs/action-plans/season-1/phase-9-deferred.md` §1.

### 6.5 Verification with Argent for mobile

Per project rule `argent.md`:
- Use `argent-environment-inspector` subagent at session start (memory check first).
- For each new mobile screen, run `argent-test-ui-flow` with `describe` →
  tap-by-coordinate (never from screenshot) → assert.
- Profile startup time with `argent-react-native-profiler` to set the S1
  baseline; record in `docs/operations/mobile-baseline.md`.

### 6.6 Exit gate

- [x] Coverage thresholds met across all packages — 95L/95F/95S/90B enforced (`bun run check` 38/38)
- [ ] All E2E suites pass on CI (web + iOS + Android) — pending first-merge run (Phase 9 Group A1)
- [ ] Hardhat contract tests pass against Polygon Amoy — deferred to Phase 9 §1 (no upstream deployment)
- [x] `prod-validator` posts a green production-readiness report — closed by `pattern_s1_phase_6_done` (GO verdict)

---

## Phase 7 — CI/CD Pipelines (GitHub Actions)

**Goal:** Every push to a feature branch runs the full check; merges to `main`
deploy to staging; tagged releases ship to production behind manual approval.

**Platform:** **GitHub Actions exclusively.** All workflows live under
`.github/workflows/`. No CircleCI, no Buildkite, no Travis, no self-hosted
Jenkins. Production deploys are tag-driven GitHub Actions runs with required
reviewers configured in repo settings → Environments → `production`.

### 7.1 Swarm

| Role | Agent | Name |
|------|-------|------|
| Lead | `cicd-engineer` | `ci-eng` |
| Workflow automation | `workflow-automation` | `wf-auto` |
| Release | `release-manager` | `releaser` |
| Multi-package sync | `sync-coordinator` | `sync-coord` |

### 7.2 Skills

- `ci-cd-pipeline-builder`
- `expo-cicd-workflows`
- `release-manager`
- `changelog-generator`
- `github:workflow-automation`

### 7.3 Required workflows (`.github/workflows/`)

| File | Triggers | Steps |
|------|----------|-------|
| `ci.yml` | `pull_request`, `push` to `main` | bun install → biome → vitest+coverage (95%) → playwright → build |
| `mobile-ci.yml` | `pull_request` touching `apps/mobile/**` or `packages/ui/native/**` | EAS build (Android + iOS internal) → Detox on iOS sim + Android emu |
| `contracts.yml` | `pull_request` touching `packages/contracts/**` | Hardhat test → solhint → mythril fast pass → gas report comment |
| `aidefence.yml` | `pull_request` | `aidefence_scan` MCP on the diff; fail on medium+ |
| `coverage-gate.yml` | `pull_request` | Hard-fail under 95/95/95/90 thresholds |
| `deploy-staging.yml` | push to `main` | Build & deploy `apps/web` → Vercel; `apps/api` → Fly.io; mobile → EAS internal track |
| `deploy-prod.yml` | `release: published` (manual) | Tag-driven; requires `releaser` approval + audit pass |
| `db-migrate.yml` | manual `workflow_dispatch` | `bun run db:migrate` against staging, then production with two-key approval |
| `ruflo-learn.yml` | nightly | `ruflo memory store` of CI metrics, `ruflo hooks post-task` |

### 7.4 Concrete CI guardrails

- Cache: Turborepo remote cache via Vercel (free tier) or self-hosted on Cloudflare R2.
- Fail PR if `bun.lockb` changed without `package.json` change (lockfile drift).
- Fail PR if any `.env*` file is in the diff.
- Refuse merge if `prod-validator` report missing.
- Auto-label `risk:contract` on contract changes, requires `security-architect`
  review before merge.

### 7.5 Exit gate

- [ ] All 8 workflows green for two consecutive PRs [^p7-contracts] — pending first-merge run (Phase 9 Group A1)
- [ ] Staging deploy round-trip < 7 minutes — pending Vercel/Fly.io provisioning (Phase 9 Group B2-B3)
- [ ] Production deploy gated by manual approval + audit-pass artifact — wired (`deploy-prod.yml`); activation pending audit (Phase 9 Group C2)
- [x] `release.yml` (Wave 7B) opens a rolling release PR on every push to
      `main`; merging it cuts tags + attaches `prod-validator-<sha>.json` — shipped wave 7B (`pattern_s1_phase_7_done`)

[^p7-contracts]: Wave 7A authored 8 of the 9 workflows in §7.3 + added
    `release.yml` in Wave 7B. `contracts.yml` is deferred to **Phase 9**
    alongside the on-chain contract surface; see
    `docs/action-plans/season-1/phase-9-plan.md`.

---

## Phase 8 — Infrastructure Cost & Deployment Settings

**Goal:** Stand up the cheapest credible production stack that still meets the
S1 promises, on a privacy-friendly host, behind Cloudflare, with backups.

**Deployment driver:** **GitHub Actions** (per Phase 7). All deploys — Vercel
(web), Fly.io (api), EAS (mobile), Polygon contract publish, Supabase
migrations — are triggered by the workflows defined in Phase 7. Manual `flyctl`
/ `vercel deploy` / `eas submit` invocations from a developer laptop are
forbidden in production paths; allowed only against ephemeral preview envs.

### 8.1 Swarm

| Role | Agent | Name |
|------|-------|------|
| Lead | `system-architect` | `infra-lead` |
| DevOps | `cicd-engineer` | `devops` |
| Cost analyst | `analyst` | `cost-analyst` |
| Security | `security-auditor` | `sec-auditor` |

### 8.2 Skills

- `aws-solution-architect`, `gcp-cloud-architect`, `azure-cloud-architect`
  (used as comparator; we will **not** use AWS/GCP for S1)
- `secrets-vault-manager`
- `terraform-patterns`
- `helm-chart-builder` (kept dormant; not used in S1)
- `observability-designer`
- `slo-architect`
- `chaos-engineering` (deferred to S4)

### 8.3 Target deployment topology (S1)

```
                ┌──────────────────────────┐
                │   Cloudflare (free)      │
                │   DNS · DDoS · CDN · WAF │
                └────────────┬─────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌─────────────────┐   ┌─────────────────┐
│ Vercel       │    │ Fly.io          │   │ Supabase Pro    │
│ apps/web     │    │ apps/api (Hono) │   │ Postgres + Stg  │
│ (free tier   │    │ shared-cpu-1x   │   │ $25/mo          │
│  + Pro $20)  │    │ ≈ $10/mo        │   │                 │
└──────────────┘    └─────────────────┘   └─────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Polygon PoS mainnet  │
                  │ CitizenVerifier.sol  │
                  │ ≈ $5/mo gas          │
                  └──────────────────────┘
                             │
                  ┌──────────────────────┐
                  │ The Graph (hosted)   │
                  │ free tier            │
                  └──────────────────────┘
                             │
                  ┌──────────────────────┐
                  │ EAS (Expo)           │
                  │ Starter $19/mo       │
                  └──────────────────────┘
```

### 8.4 Monthly cost target (pilot ≈ 1k MAU) — must match cost-scenarios.md S1

| Line | Amount | Note |
|------|--------|------|
| Supabase Pro | $25 | |
| Vercel Pro (web) | $20 | |
| Fly.io shared-cpu-1x × 1 + tiny Postgres-free | $10 | |
| EAS Starter | $19 | |
| Polygon gas (ZKP verify, batched) | $18.76 | Post-Chicago hardfork (PIP-88, 2026-05-21). Rebaselined from $5 in Phase 2 reconciliation per [[s2-polygon-gas]]. |
| The Graph hosted | $0 | |
| Cloudflare free | $0 | |
| Backups (Supabase included) | $0 | |
| Misc (domains, sentry free, etc.) | $20 | |
| **Total (standard)** | **≈ $113/mo** | Volatility band: off-peak $95 / standard $113 / spike $151. |

> Drift tolerance bands (per [[s1-cost-drift]]): Green ≤ $105 / Amber
> $105–$115 / Red > $115. If total > $115 for two consecutive weeks,
> `cost-analyst` files a `risk:budget` issue and updates the drift memo.
> Full reconciliation in `docs/data-points/s1-cost-reconciliation-phase-8.md`.

### 8.5 One-time spend

| Item | Amount |
|------|--------|
| `CitizenVerifier.sol` integration audit (boutique reviewer / Code4rena solo / Cantina) | $3,000 – $10,000 |
| Apple Developer Program | $99 / year |
| Google Play Console | $25 one-time |
| Domains (3 across TLDs `.org`, `.io`, `.is`) | ≈ $80 / year |

### 8.6 Settings checklist (deployment)

- [ ] Supabase custom domain configured for **all** API endpoints (India ISP
      mitigation per ADR-009).
- [ ] Supabase **row-level security** ON for every table touching citizens;
      service-role key never reaches the client.
- [ ] Supabase Storage bucket `complaint-photos` private; access via signed URL only;
      bucket policy enforces server-side EXIF strip before write.
- [ ] Cloudflare proxy ON, "Under Attack" mode toggle documented in
      `docs/operations/runbook-ddos.md`.
- [ ] Fly.io: `min_machines_running=1`, 256MB RAM, 1 shared-cpu, region `bom`
      (Mumbai) primary, `sin` (Singapore) failover.
- [ ] Vercel: project locked to `apps/web`; preview branch protection on.
- [ ] EAS: Android internal track + iOS TestFlight only in S1 (no public store
      listing until S2 audit).
- [ ] Polygon: deploy from a **multisig** (3/5 Safe), never an EOA.
- [ ] Sentry free tier: web + api + mobile, scrub PII via beforeSend.
- [ ] `.env` discipline — never edited by Claude; secrets live in Vercel /
      Fly.io / EAS / GitHub Actions vaults. (see `feedback_env_file_hands_off`.)
- [ ] **Bypass guardrails** policy: any deployment shortcut MUST use
      `BYPASS_GUARDRAILS=<class> BYPASS_REASON="…"` per
      `reference_guardrail_bypass_env_vars`.

### 8.7 Observability (minimum)

- Logs: Fly.io native + Vercel logs streamed to Sentry.
- Errors: Sentry free tier (web + api + mobile).
- Synthetic uptime: `curl` checks via Cloudflare Workers Cron (free).
- Chain health: The Graph dashboard.
- Weekly scorecard from Phase 2 published to `docs/operations/`.

### 8.8 Exit gate

- [ ] Production stack live behind primary domain + 2 backup domains
- [ ] Monthly cost reconciled to ≤ **$115** actual (Amber ceiling) for two
      consecutive months. *(Amended from "≤ $110" on 2026-05-25 to align with
      the post-Chicago Polygon-gas volatility band $95 / $113 / $151 and the
      tolerance bands in `reference_s1_cost_drift`: Green ≤$105 / Amber
      $105–$115 / Red >$115. See `docs/data-points/s1-cost-reconciliation-phase-8.md`.)*
- [ ] Audit report for `CitizenVerifier.sol` integration glue: **no high or
      critical** findings open
- [ ] Disaster drill: nuke Fly.io app, restore from main + Supabase backup, in
      < 30 minutes; documented in `docs/operations/dr-drill-s1.md`

---

## Phase 9 — User Testing & Production-Side Validation

**Goal:** Land the four items deliberately deferred from Phase 5 (because they depend on **external upstream**, **ops infrastructure**, or **legal counsel**) and validate the full S1 surface end-to-end before launch announcement.

Triggers after Phase 8 (Infrastructure Cost & Deployment) closes and the user has exercised web + iOS + Android end-to-end without regressions.

Scope + per-item plan + cited legal sources live in `docs/action-plans/season-1/phase-9-deferred.md`. Summary:

1. **On-chain `verifyAndRecord`** via CitizenVerifier — blocked on AnonCitizen upstream Polygon Amoy/mainnet deployment ([[s1-zkp-findings]] OQ-1)
2. **Rate limiter** — Upstash Redis (Mumbai) chosen 2026-05-26. Code complete (`apps/api/src/lib/upstash-rate-limiter.ts` + auto-select). Activation = user creates Upstash Redis + sets two Fly secrets.
3. **DPDP §8(7) review** + `grievance_contacts` table split + retention raise to 365d general / 30d post-resolve PII (blocks on legal counsel)
4. **Production rapidsnark distribution** — Docker layer / S3 init container / Lambda layer (local-dev contract already in `apps/api/zkp-artifacts/README.md`)
5. **Production deployment provisioning** — absorbed from Phase 8 user-ops: 9 ordered actions (GitHub secrets / Vercel / Fly / Supabase + custom domain / Cloudflare / EAS / Sentry DSNs / Cloudflare Workers uptime deploy / migration 0004). Recurring ≈ $113/mo within the §8.8 amended ≤ $115 Amber ceiling.
6. **Polygon multisig + CitizenVerifier integration audit** — 3/5 Safe + boutique reviewer engagement ($3,000–$10,000 one-shot). Blocks the first prod release tag.
7. **First DR drill + two-month cost reconciliation** — §8.8 exit-gate items 3 & 4.

Exit gate per `phase-9-deferred.md`.

---

## S1 → S2 Graduation Triggers

Per cost-scenarios.md, the swarm graduates to S2 planning when **any** of:

- ≥ 5,000 verified citizens registered, OR
- First takedown request or seizure scare (per-complaint anchoring becomes the
  differentiator), OR
- > 5% of complaints flagged for moderation (manual queue saturated).

When triggered, `planner` opens `docs/action-plans/s2-action-plan.md` and runs
the **same eight-phase template** against the S2 stack delta in
[`cost-scenarios.md`](../../product/cost-scenarios.md#s2--tamper-evident-pilot).

### Handover file (S1 → S2)

A dedicated **handover** document captures everything S2 needs to start
without re-discovering S1 state. It is **not** a postmortem and **not** a
PRD — it is the operational baton.

- Location: [`docs/action-plans/s1-to-s2-handover.md`](./s1-to-s2-handover.md)
- Owner: `planner` agent (lead), countersigned by `architect` and `sec-architect`.
- Trigger: any S2 graduation condition above fires, OR the user runs
  `/handover s1-to-s2`.

**Generation command** (uses the `handoff` skill + Ruflo memory):

```bash
# 1. Pull every S1 memory the swarm has stored
npx ruflo@latest memory search --namespace patterns --query "s1-" > /tmp/s1-memories.jsonl

# 2. Snapshot live operational numbers
npx ruflo@latest memory search --namespace metrics --query "s1-scorecard" >> /tmp/s1-memories.jsonl

# 3. Spawn the handover swarm (one message, named agents, SendMessage chain)
#    planner → architect → sec-architect → reviewer → tester
#    Each agent fills its assigned section of s1-to-s2-handover.md
#    Final reviewer SendMessage's the user when the file is signed off.
```

**Required sections** (the stub file ships with these headers — the swarm
fills them in):

| § | Section | Owner agent | Source of truth |
|---|---------|-------------|-----------------|
| 1 | S1 state snapshot (date, MAU, verified citizens, complaints, mod queue depth) | `cost-analyst` | weekly scorecard |
| 2 | Which graduation trigger fired and the evidence | `planner` | metrics + incident log |
| 3 | Live infra inventory (URLs, regions, instance sizes, secrets locations) | `devops` | deployment workflows |
| 4 | Open risks carried into S2 (what S1 did NOT solve) | `sec-architect` | threat model + audit findings |
| 5 | Frozen contracts (S1 ABIs, addresses, subgraph IDs, nullifier set size) | `architect` | on-chain + ADRs |
| 6 | Data shape inventory (Drizzle schema version, row counts, FTS index sizes) | `db-architect` | `bun run db:generate` diff + `pg_stats` |
| 7 | Test + coverage baseline (numbers per package) | `qa-lead` | `bun run test:coverage` output |
| 8 | Cost baseline (last 3 months actual vs target) | `cost-analyst` | billing exports |
| 9 | S2 stack delta read-out (what gets added, who owns it, dependency order) | `architect` | cost-scenarios §S2 |
| 10 | Cutover plan (additive only — nothing removed) | `planner` | this doc §0–§8 |
| 11 | Rollback plan (how to keep running on S1 if S2 stalls) | `devops` | DR drill log |
| 12 | Open ADRs that S2 must resolve (e.g., ADR-011 ComplaintRegistry batching cadence) | `adr-writer` | `docs/adr/` |
| 13 | Memory keys to carry forward (`[[s1-zkp-findings]]`, etc.) | `planner` | `MEMORY.md` |
| 14 | Sign-offs (planner / architect / sec-architect / user) | all | inline checkboxes |

**Skills loaded for handover:**

- `handoff`
- `postmortem` (only for §4 risks if a graduation incident triggered it)
- `release-manager` (for §10 cutover)
- `decision-logger` (for §12 open ADRs)
- `runbook-generator` (for §11 rollback)

**After-handover memory write:**

```bash
npx ruflo@latest memory store --namespace patterns \
  --key "s1-to-s2-handover-signed" \
  --value "Signed YYYY-MM-DD. Trigger: <which one>. Owner: planner. Next: s2-action-plan.md phase 1."
npx ruflo@latest hooks post-task --task-id "s1-to-s2-handover" --success true --store-results true
```

**Exit gate for the handover itself:**

- [ ] All 14 sections filled, no `TBD` markers remaining
- [ ] Four sign-off checkboxes ticked (planner, architect, sec-architect, user)
- [ ] `s2-action-plan.md` Phase 1 swarm has the handover linked in its kickoff
      prompt
- [ ] Ruflo memory entry `s1-to-s2-handover-signed` exists

---

## Master kickoff (run this once)

```bash
# Prereqs (manual, one-time):
#  1. Create GitHub Project (v2) "Factivist — S1 Verifiable Lean MVP"
#     with the views + custom fields described in Phase 1.3.
#  2. Enable the GitHub Wiki on this repo and create the 5 seed pages.
#  3. Create a Claude Design project; share-URL goes into the
#     `Project Settings` discussion thread.
#  4. Confirm `.github/workflows/` is the only CI/CD surface (Phase 7).

# Bootstrap
npx ruflo@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
npx ruflo@latest memory search --query "factivist s1" --namespace patterns
npx ruflo@latest hooks route --task "Execute S1 verifiable lean MVP"

# Spawn Phase 1 swarm (planner-led)
#   — fan out to zkp-researcher, civic-researcher, legal-researcher
#   — each SendMessage back to planner
#   — planner SendMessage to spec-writer when all three complete

# Then sequentially execute Phases 2 → 8, each phase its own swarm
# After each phase:
npx ruflo@latest memory store --namespace patterns --key "s1-phase-<n>-done" --value "<summary>"
npx ruflo@latest hooks post-task --task-id "s1-phase-<n>" --success true --store-results true
```

---

## Cross-references

- Vision and feature catalog: [`docs/product/product-vison.md`](../../product/product-vison.md)
- Cost layering and S1 definition: [`docs/product/cost-scenarios.md`](../../product/cost-scenarios.md)
- Long-term cost model: [`docs/product/cost-at-scale.md`](../../product/cost-at-scale.md)
- AI systems (used from S2): [`docs/product/ai-systems.md`](../../product/ai-systems.md)
- Anonymity guarantees: [`docs/product/anonymity-privacy.md`](../../product/anonymity-privacy.md)
- anoncitizen audit + migration: [`docs/product/anoncitizen-audit.md`](../../product/anoncitizen-audit.md), [`docs/product/anoncitizen-migration-runbook.md`](../../product/anoncitizen-migration-runbook.md)
- Guardrails policy: [`docs/guardrails.md`](../../guardrails.md)
- Agent ACL: [`docs/agent-acl.md`](../../agent-acl.md)
- Local dev: [`docs/local-dev.md`](../../local-dev.md), [`docs/setup.md`](../../setup.md)
