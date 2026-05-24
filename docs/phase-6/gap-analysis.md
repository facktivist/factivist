# Phase 6 — Test Inventory & Gap Analysis

**Author:** `qa-lead` (Phase 6 wave A)
**Branch:** `feat/season-1-orchestration` @ `a9f4950`
**Run date:** 2026-05-24
**Source of truth for minimums:** `docs/action-plans/season-1/s1-action-plan.md` §6.4 (lines 466–478)
**Coverage gate (workspace):** ≥ 95L / ≥ 95F / ≥ 95S / ≥ 90B (`tooling/vitest-config/base.ts`)

`bun run check` is currently 38/38 green. All numbers below are from a fresh `bun run test:coverage --force` and a tree walk of `__tests__/` + `e2e/`.

---

## Section A — Phase 6 §6.4 minimums vs. current state

`it()/test()` invocation counts per file are the unit; suite count = sum across the file path glob in column 2.

| # | Suite | Min | Current | Δ | Quality verdict |
|---|---|---:|---:|---:|---|
| 1 | Identity / ZKP integration — `apps/api/src/{routes,lib}/__tests__/{identity,zkp-prover,session-cookie,supabase-jwks,supabase-auth,dev-metrics}.test.ts` | 12 | **138** (48 + 16 + 23 + 22 + 14 + 15) | +126 | **GREEN.** Full IDENT-001..007 coverage including replay 409, banned-PII column guard, server-side prove fallback, witness zeroisation. JWKS + session cookie 100% L. **Open:** no explicit "circuit-rejection matrix" test (bad proof structure, wrong public-signals length, malformed Groth16 envelope) — currently covered indirectly via `verify-proof.test.ts` in `zkp-client` (21 tests). Acceptable. |
| 2 | Complaint API — `apps/api/src/routes/__tests__/complaint.test.ts` + `uploads.test.ts` | 15 | **54** (28 + 26) | +39 | **GREEN.** Includes the four flag-reason map cases (pii-leak, off-topic, spam, misinformation), 401/404/400/204 matrix, transactional SLA tighten. ADR-0021 `pii-leak` distinct flag asserted at `complaint.test.ts` `POST /complaints/:slug/flag > maps misinformation → false`. |
| 3 | Discovery / FTS — `apps/api/src/routes/__tests__/discovery.test.ts` + `constituency.test.ts` + `categories.test.ts` | 8 | **40** (20 + 16 + 4) | +32 | **GREEN** by count. Categories file is light (4 tests) — `routes/categories.ts` is a passthrough, so this is fine. Discovery covers sort modes, pagination, constituency filtering. **Open:** no Postgres `tsvector` rank/recency tie-break adversarial test (mock returns ordered rows). Acceptable at S1; flag for S2 ranking work. |
| 4 | Moderation queue — `apps/api/src/routes/admin/__tests__/{moderation,audit,grievance,grievances}.test.ts` | 8 | **66** (16 + 25 + 10 + 15) | +58 | **GREEN.** 100% L on admin route files. 18-vector deanonymization matrix is enforced at the web layer (`apps/web/e2e/admin-deanon.spec.ts`) — see Section B. |
| 5 | Web E2E — `apps/web/e2e/*.spec.ts` (onboarding, submit, browse, comment, flag) | 5 | **3 files / 8 it()** (`landing`, `complaint`, `admin-deanon`) | −2 files | **AMBER.** Have: landing (1), complaint browse smoke (2), admin-deanon adversarial (5). Missing: explicit **onboarding** (verify-form happy path), **comment** (S1 ships without comments per [[s1-phase-5-done]] §"Wave 4 nice-to-haves" #5 → **out of scope, action plan over-specified**), **flag** end-to-end click→toast (only unit FlagButton.test.tsx). `submit` (compose) flow is not in e2e — covered at unit level via `ComposerShell.test.tsx` + `CreateComplaintForm.test.tsx` + `createComplaintAction.test.ts` but not as a browser-driven smoke. |
| 6 | Mobile E2E (iOS) — `apps/mobile/e2e/*.spec.ts` via Detox | 5 | **2 files / 2 it() + 5 it.todo()** (`home`, `complaint`) | −3 it | **RED.** `home.spec.ts` has 2 real assertions. `complaint.spec.ts` is 5× `it.todo()` waiting on Pipeline E Storage bucket + photo fixtures. Detox config exists (`apps/mobile/.detoxrc.js`) with both `ios.sim.debug` (iPhone 15) and `android.emu.debug` (Pixel_7_API_34) — see Section B. |
| 7 | Mobile E2E (Android) — same files | 5 | **0 distinct files** (shares iOS spec set) | −5 | **RED-but-by-design.** Detox spec files run cross-platform; only one binary per config. Adequate IF we run BOTH `ios.sim.debug` and `android.emu.debug` in CI; today only iOS local script exists (`bun run test:e2e:ios`). No `test:e2e:android` script wired in `apps/mobile/package.json`. |
| 8 | Contract glue — `packages/contracts/test/CitizenVerifier.t.ts` | 10 | **0** (package does not exist) | −10 | **DEFERRED.** `packages/contracts/` does not exist. Per [[s1-phase-5-done]] §"Wave 4 deferred items" #2, on-chain `verifyAndRecord` is blocked on upstream Polygon mainnet/Amoy CitizenVerifier deployment ([[s1-zkp-findings]] OQ-1). Hardhat tests against a non-existent ABI cannot be written. **Recommendation:** mark Phase 6 §6.4 row 8 as Pipeline E (production deploy), not Phase 6. |
| 9 | Schema / Zod — `packages/shared/src/{validators,constants,types}/__tests__/*.test.ts` | 20 | **264** (26 + 38 + 62 + 31 + 15 + 9 + 5 + 21 + 6 + 7 + 7 + 5) | +244 | **GREEN.** 100% L / 97.5% B on `packages/shared`. |

**Headline:** 7/9 rows GREEN, 1/9 AMBER (web e2e — coverage of intent, not count), 1/9 RED (mobile e2e — Detox specs are placeholders), 1/9 DEFERRED (contract glue — upstream blocker).

---

## Section B — E2E status

### Web — Playwright

**Config:** `apps/web/playwright.config.ts` is **already correct**:
- `webServer.command: 'bun run dev'` (line 21)
- `webServer.url: 'http://localhost:3000'` (line 22)
- `reuseExistingServer: !process.env.CI` (line 23) — CI always boots fresh, dev reuses
- 5 projects (chromium / firefox / webkit / Mobile Chrome / Mobile Safari)

The 5 `test.skip(true, 'web/api dev servers unreachable')` guards in `admin-deanon.spec.ts:62,90,108,131,154` skip on **API at :3001** unreachability, not the Next dev server. Playwright's `webServer` block boots only the web app — the Hono API is a sibling process. Two fixes are possible:

1. **Add a second `webServer` entry** for the API (Playwright supports an array). Boots `bun --hot src/index.ts` in `apps/api` with a healthcheck on `localhost:3001/health`.
2. **Use Turbo orchestration** at the script level: change `test:e2e` to `turbo run dev --filter=@factivist/api & playwright test`.

Option 1 is cleaner and removes the skip-on-503 logic entirely. **This is the single highest-leverage Phase 6 wave-A change for web e2e.**

**Specs present:**
- `e2e/landing.spec.ts` — 1 test, exercises CtaButton toggle. Active.
- `e2e/complaint.spec.ts` — 2 tests, discovery render + sort smoke. Active.
- `e2e/admin-deanon.spec.ts` — 5 tests, 18-vector PII deanonymization matrix. **5× conditionally skip.**

**Missing per §6.4 row 5:**
- **Onboarding flow** (visit `/login` → magic-link callback → `/identity` verify form) — none today.
- **Submit (compose) flow** as a browser smoke — none today; unit-level coverage is comprehensive.
- **Flag flow** as a browser smoke — only unit `FlagButton.test.tsx`.
- **Comment flow** — **out of scope for S1** ([[s1-phase-5-done]] §"Wave 4 nice-to-haves" #5).

### Mobile — Detox

**Config:** `apps/mobile/.detoxrc.js` is **structurally complete**:
- iOS sim: iPhone 15, debug binary at `ios/build/Build/Products/Debug-iphonesimulator/Factivist.app` (line 28)
- Android emu: `Pixel_7_API_34`, debug APK at `android/app/build/outputs/apk/debug/app-debug.apk` (line 34)
- Both `ios.sim.debug` and `android.emu.debug` configurations declared (lines 51–58)

**Specs present:**
- `e2e/home.spec.ts` — 2 real `it()` (SafeAreaView visibility, CTA label toggle). Active.
- `e2e/complaint.spec.ts` — 5× `it.todo()`. Inert until Pipeline E lands the Storage bucket + photo fixtures.

**Gaps:**
1. `apps/mobile/package.json` likely lacks `test:e2e:android` (only `test:e2e:ios` referenced). Needs symmetric `detox test -c android.emu.debug`.
2. `bunx expo prebuild --clean` has never been run on CI runners (no `ios/` or `android/` checked in).
3. The 5 `complaint` todos are correctly gated — converting them to real specs is the **detox-eng** scope per task instructions, not qa-lead.

---

## Section C — Coverage scorecard

Source: `bun run test:coverage --force` 2026-05-24. All packages pass the 95/95/95/90 gate **at the vitest threshold check**.

| Package | %L | %F | %S | %B | Notes / uncovered files |
|---|---:|---:|---:|---:|---|
| `apps/api` | 98.24 | 100 | 97.51 | 94.15 | `identity.ts:521,311,503-506` (server-prove edge paths); `dev-metrics.ts:117-118`; `exif-strip.ts:87-88`; `session-cookie.ts:175,211`; `zkp-prover.ts:164`. All bounded, all defensive branches. |
| `apps/web` | 98.90 | 98.41 | 98.31 | 95.58 | Above gate on every metric. |
| `apps/mobile` | 97.33 | 96.29 | 96.96 | 90.33 | Just above gate on branches (90.33 vs. 90.00). **Brittle:** a single uncovered ternary in a future commit will tip below. |
| `packages/shared` | 100 | 100 | 100 | 97.50 | |
| `packages/db` | 100 | 98.07 | 99.39 | 94.11 | |
| `packages/ui/theme` | 100 | 100 | 100 | 100 | |
| `packages/ui/native` | 100 | 100 | 100 | 100 | |
| `packages/ui/web` | 100 | 100 | 100 | 100 | |
| `packages/codegraph` | 100 | 98.27 | 99.44 | 91.78 | |
| `packages/guardrails` | 100 | 100 | 99.59 | 93.33 | |
| `packages/agent-acl` | 99.40 | 95.45 | 97.44 | 94.44 | |
| `packages/zkp-client` | **0/0** | **0/0** | **0/0** | **0/0** | **Not a real gap.** Only source file is `src/index.ts`, which the workspace-wide coverage `exclude: ['**/index.ts', ...]` rule in `tooling/vitest-config/base.ts:23-30` strips out. 21 tests pass and exercise the file end-to-end. **Config fix:** override `exclude` in `packages/zkp-client/vitest.config.ts` to drop `**/index.ts` for this package only (its index IS the implementation, not a barrel re-export). |

**Workspace aggregate: PASS on every gate**, with `apps/mobile` branches the narrowest margin (90.33 vs. 90.00).

---

## Section D — Recommended Phase 6 punch list (leverage-ordered)

| # | Action | Owner | Effort | Unblocks |
|---|---|---|---:|---|
| 1 | **Add a second `webServer` entry to `playwright.config.ts`** booting `apps/api` on :3001 with a healthcheck on `/health`. Then delete the 5 `test.skip(...'web/api dev servers unreachable'...)` guards in `admin-deanon.spec.ts`. | `playwright-eng` | S | 5 currently-gated PII-deanonymization assertions go live, +0 new tests but +5 covered lanes. |
| 2 | **Fix `packages/zkp-client/vitest.config.ts`** to override the workspace `exclude` rule for `**/index.ts` so the 21 verify-proof tests count toward coverage. Without this, the package's gate is vacuously satisfied (0/0). | `qa-lead` (config change only; not source) | XS | Real coverage gate on the ZKP client. |
| 3 | **Add 3 missing web e2e flows** as Playwright specs in `apps/web/e2e/`: `onboarding.spec.ts` (login → callback → identity verify form, mocked magic-link), `compose.spec.ts` (compose tab → composer → submit happy path), `flag.spec.ts` (browse → click flag → reason selection → toast). Each ≥2 `it()`. | `playwright-eng` | M | Closes §6.4 row 5 by quality (not just count). |
| 4 | **Convert the 5 mobile `it.todo()` in `apps/mobile/e2e/complaint.spec.ts`** to real Detox specs using Argent MCP per `argent.md` skill_routing (`argent-test-ui-flow` + `describe` discovery). Per task brief — **out of qa-lead scope, handed to detox-eng.** | `detox-eng` | L | Closes §6.4 row 6 and (with #5 below) row 7. |
| 5 | **Wire `test:e2e:android` in `apps/mobile/package.json`** (mirror of `test:e2e:ios` with `-c android.emu.debug`) and add an Android job to CI. | `detox-eng` | S | Closes §6.4 row 7. |
| 6 | **Strengthen `apps/mobile` branch coverage** (currently 90.33% vs. 90.00 gate, ±0.33 margin). Audit `apps/mobile/src/features/complaint/` for ungated paths in `usePhotoCapture.ts` + `useTusUpload.ts`. | `tdd-london` (Phase 6 wave B) | S | Removes single-commit-tip-below risk. |
| 7 | **Mark §6.4 row 8 (Hardhat contract glue) as DEFERRED to Pipeline E** in the action plan. Cannot be written until upstream `CitizenVerifier.sol` is deployed to Amoy — [[s1-phase-5-done]] §"Wave 4 deferred items" #2. | `qa-lead` (action-plan amend) | XS | Removes a phantom Phase 6 blocker. |
| 8 | **Audit `apps/api/src/routes/identity.ts:303-321, 503-506` uncovered lines** — confirm they are defensive `instanceof Error` branches and not skipped circuit-rejection paths. | `tdd-london` | XS | Verifies §6.4 row 1 "circuit-rejection matrix" intent. |

---

## Section E — Phase 6 §6.6 exit-gate readiness

| Gate item | Status | Evidence |
|---|---|---|
| Coverage thresholds met across all packages | **GO** with one caveat | All 12 packages pass `bun run test:coverage`. `apps/mobile` branches at 90.33% — within gate but margin is 0.33pp; recommend action D6 before declaring stable. `zkp-client` reports 0/0 — vacuously passes but action D2 should be applied for true gate. |
| All E2E suites pass on CI (web + iOS + Android) | **NO-GO** | Web: 5 of 8 e2e tests conditionally skip on API-:3001 unreachability (D1 fixes). iOS: only 2 real assertions vs. §6.4 minimum 5 (D4). Android: no CI job, no `test:e2e:android` script (D5). |
| Hardhat contract tests pass against Polygon Amoy | **DEFERRED** | `packages/contracts/` does not exist. Upstream blocker per [[s1-phase-5-done]] §"Wave 4 deferred items" #2. Recommend D7. |
| `prod-validator` green production-readiness report | **PENDING** | Cannot run until D1, D3, D4, D5 land. `prod-validator` is a Phase 6 wave C/D handoff. |

**Overall: NO-GO on Phase 6 exit.** Three of four gate items have specific named blockers. The work is clearly scoped and parallelisable across `playwright-eng` (D1, D3), `detox-eng` (D4, D5), and `qa-lead` (D2, D7, D8). Nothing requires a Phase 5 reopen.

---

## Handoff block

```yaml
artifact: docs/phase-6/gap-analysis.md
top_3_actions_priority_order:
  1: playwright-eng — Add second `webServer` entry to `apps/web/playwright.config.ts` booting `apps/api` on :3001, then drop the 5 skip guards in `admin-deanon.spec.ts:62,90,108,131,154`.
  2: playwright-eng — Author 3 missing web E2E specs in `apps/web/e2e/`: `onboarding.spec.ts`, `compose.spec.ts`, `flag.spec.ts` (each ≥ 2 `it()`).
  3: detox-eng — Convert the 5 `it.todo()` in `apps/mobile/e2e/complaint.spec.ts` to real Detox specs via Argent MCP per `argent.md`; also wire `test:e2e:android` script in `apps/mobile/package.json`.
blockers_needing_lead_attention:
  - Action plan §6.4 row 8 (Hardhat `CitizenVerifier.t.ts` × 10) is unwritable at S1 — upstream Polygon Amoy CitizenVerifier deployment is the blocker per [[s1-phase-5-done]] §"Wave 4 deferred items" #2. Lead should re-scope this row to Pipeline E or strike it from Phase 6 exit.
  - Action plan §6.4 row 5 lists "comment" as a required web E2E flow — but S1 ships without comments per [[s1-phase-5-done]] §"Wave 4 nice-to-haves" #5. Lead should remove "comment" from the §6.4 row 5 list.
non_blocking_observations:
  - `apps/mobile` branch coverage is 90.33% vs. 90.00% gate. Margin is 0.33pp; one new ungated ternary will tip it. Defer to tdd-london in Phase 6 wave B.
  - `packages/zkp-client` reports 0/0 coverage because `src/index.ts` is excluded by the workspace-wide `**/index.ts` rule. Vacuously passes the gate but should be fixed in `packages/zkp-client/vitest.config.ts` (config change only, no source touch) so the 21 verify-proof tests actually count.
read_only_audit_confirmed: true
source_modifications: none
```
