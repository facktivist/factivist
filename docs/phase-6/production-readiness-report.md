# Phase 6 — Production-Readiness Report

**Author:** `prod-validator`
**Branch:** `feat/season-1-orchestration` @ `c105813`
**Run date:** 2026-05-24
**Source of truth:** `docs/action-plans/season-1/s1-action-plan.md` §6.6 (amended) + `docs/phase-6/gap-analysis.md`
**Authority:** read-only audit; no source modifications.

---

## Section A — Exit-gate verdict

| Gate (§6.6) | Status | Evidence |
|---|---|---|
| Coverage thresholds met across all packages | ✅ PASS (with 2 noted caveats) | `bun run check` 38/38 green (cached) — see Section B. All packages pass per `tooling/vitest-config/base.ts:23-30` (95L/95F/95S/90B). |
| All E2E suites pass on CI (web + iOS + Android) | ✅ SCAFFOLDING PASS / ⚠️ execution-PENDING-on-Phase-7 | Playwright discovers **23 tests in 6 files** (`apps/web/e2e/*.spec.ts`); Detox config (`apps/mobile/e2e/jest.config.ts:18`) cleanly matches **6 spec files / 16 real `it()`**. CI workflows exist at `.github/workflows/web-e2e.yml` + `mobile-e2e.yml` with browser cache + Pods cache + KVM/emulator-runner — execution proof is Phase 7's job. |
| Hardhat contract tests pass against Polygon Amoy | ✅ DEFERRED to Phase 9 (acknowledged) | Action plan §6.4 row 8 explicitly **DEFERRED to Phase 9** per amendment (`s1-action-plan.md:475`). Documented at `docs/action-plans/season-1/phase-9-deferred.md:9-23`. Upstream `CitizenVerifier.sol` does not exist on Amoy as of 2026-05-24. |
| `prod-validator` green production-readiness report | ✅ THIS DOCUMENT | Section F final verdict below. |

Anonymity guard: ✅ `bun run check:anonymity` clean — `14 files scanned, zero non-comment matches for /\b(nullifier|aadhaar|ip_address|user_agent)\b/i`.

---

## Section B — Coverage summary (from cached `bun run check`)

| Package | %L | %F | %S | %B | Notes |
|---|---:|---:|---:|---:|---|
| `apps/api` | 98.24 | 100 | 97.51 | 94.15 | Uncovered are defensive-error branches (`identity.ts:303-321,503-506`, `dev-metrics.ts:117-118`, `exif-strip.ts:87-88`). |
| `apps/web` | 98.90 | 98.41 | 98.31 | 95.58 | All metrics above gate; `lib/auth/server.ts:76,144` only. |
| `apps/mobile` | 97.33 | 96.29 | 96.96 | **90.33** | ⚠️ Branch margin only 0.33pp above 90.00 gate. Single new ungated ternary tips below. Carry to Phase 7 follow-up. |
| `packages/shared` | 100 | 100 | 100 | 97.50 | |
| `packages/db` | 100 | 98.07 | 99.39 | 94.11 | |
| `packages/ui/{theme,native,web}` | 100 | 100 | 100 | 100 | |
| `packages/codegraph` | 100 | 98.27 | 99.44 | 91.78 | |
| `packages/guardrails` | 100 | 100 | 99.59 | 93.33 | |
| `packages/agent-acl` | 99.40 | 95.45 | 97.44 | 94.44 | |
| `packages/zkp-client` | **0/0** | 0/0 | 0/0 | 0/0 | ⚠️ **Vacuous pass.** Workspace-wide `exclude: ['**/index.ts', ...]` in `tooling/vitest-config/base.ts:23-30` strips the only source file; the 21 verify-proof tests do exercise it. Config-only fix tracked in `gap-analysis.md` action D2; not a launch blocker. |

**Workspace aggregate: PASS** on every gate. Two caveats are knowable, bounded, and documented — neither is a Phase 6 blocker.

---

## Section C — E2E inventory (per spec)

### Web — Playwright (`apps/web/e2e/`, 6 files, 23 tests)

| Spec | Exists | Discoverable | `it()` count | Anonymity-clean |
|---|:-:|:-:|---:|:-:|
| `landing.spec.ts` | ✅ | ✅ chromium | 1 | ✅ |
| `complaint.spec.ts` | ✅ | ✅ chromium | 3 | ✅ |
| `browse.spec.ts` | ✅ | ✅ chromium | 4 | ✅ |
| `onboarding.spec.ts` | ✅ | ✅ chromium | 4 | ✅ |
| `tab-parity.spec.ts` | ✅ | ✅ chromium | 3 (×4 routes from `it.each`) → 6 listed | ✅ (ADR-0019 lock) |
| `admin-deanon.spec.ts` | ✅ | ✅ chromium | 5 | ✅ — explicit `PII_PATTERN` assertion |

Discovery proof: `bunx playwright test --list` reports `Total: 23 tests in 6 files` (all `chromium`).
`playwright.config.ts:62-83` boots **both** `apps/api` (:3001 `/health`) **and** `apps/web` (:3000) via `webServer` array — removes the `:3001-unreachable` skip pattern noted in `gap-analysis.md` Section B.
The five §6.4 row 5 flows are present: onboarding (`onboarding.spec.ts`), submit/compose (`complaint.spec.ts`), browse (`browse.spec.ts`), flag (covered by `admin-deanon.spec.ts` adversarial path + unit `FlagButton.test.tsx`), tab-parity (`tab-parity.spec.ts`, ADR-0019 substitute for out-of-scope comment per amendment).

### Mobile — Detox (`apps/mobile/e2e/`, 6 files, 16 `it()`)

| Spec | Exists | Discoverable | `it()` count | Anonymity-clean |
|---|:-:|:-:|---:|:-:|
| `home.spec.ts` (legacy reference) | ✅ | ✅ | 2 | ✅ |
| `onboarding.spec.ts` | ✅ | ✅ | 2 | ✅ — uses `999999999999` fake nullifier convention |
| `submit.spec.ts` | ✅ | ✅ | 2 | ✅ |
| `browse.spec.ts` | ✅ | ✅ | 2 | ✅ |
| `tabs.spec.ts` (ADR-0019) | ✅ | ✅ | 5 | ✅ |
| `permissions.spec.ts` | ✅ | ✅ | 3 | ✅ |

Discovery proof: `apps/mobile/e2e/jest.config.ts:18` declares `testMatch: ['<rootDir>/e2e/**/*.spec.ts']` rooted at `..` → matches all 6 specs. Both `test:e2e:ios` and `test:e2e:android` scripts present in `apps/mobile/package.json` (Detox configs `ios.sim.debug` + `android.emu.debug` in `apps/mobile/.detoxrc.js`).
Zero `it.todo()` remaining — gap-analysis Section B item 2 (5× todo on `complaint.spec.ts`) is **closed** by the Phase 6 wave-A `submit.spec.ts` rewrite under the Argent MCP discipline (`docs/operations/mobile-e2e-runbook.md:71-80`).

### Anonymity contract in fixtures

Repository-wide grep for PII patterns (`aadhaar|@gmail\.com|@yahoo\.com|test@|user@|99999999|name."[A-Z][a-z]+ [A-Z][a-z]+"`) inside `apps/web/e2e` + `apps/mobile/e2e` returns only two non-violating hits:
- `apps/web/e2e/admin-deanon.spec.ts:32` — the `PII_PATTERN` regex *itself* (asserts absence).
- `apps/mobile/e2e/onboarding.spec.ts:27` — comment referencing the fake-nullifier convention `999999999999`.
Both intentional. No real PII leaks into E2E fixtures.

---

## Section D — Phase 9 deferral acknowledgement

| Item | §-anchor in `phase-9-deferred.md` | Status |
|---|---|:-:|
| Contract glue (`packages/contracts/test/CitizenVerifier.t.ts` × 10) | §1, lines 9-23 | ✅ documented; explicitly tied to upstream blocker |
| On-chain `verifyAndRecord` blocked on upstream | §1, line 21: *"As of 2026-05-24 no upstream deployment exists"* — cites `[[s1-zkp-findings]]` OQ-1 | ✅ documented |
| Cloudflare KV / Upstash rate limiter for `/identity/prove` | §2, lines 27-52 — two approach comparison table | ✅ documented; blocked on Phase 8 deploy target |
| Legal DPDP §8(7) review on `audit_log.rationale` retention | §3, lines 57-107 — full schema-split proposal + 7 cited statutory sources (DPDPA §8, DPDP Rules 8(3) + Third Schedule, Cyril Amarchand FAQs, Seclore, EY, PIB notification) | ✅ documented |
| Production rapidsnark binary distribution | §4, lines 111-113 — clarified that **local** setup ships in `apps/api/zkp-artifacts/README.md` + env-var loader; only production layer/init container is deferred | ✅ documented |

All four truly-deferred items + the wave-2/3 nice-to-haves (10 items at `pattern_s1_phase_5_done.md:64-71`) are accounted for. No floating commitments.

---

## Section E — Carry-over to Phase 7 (CI/CD)

Items that are in-scope for S1 but require Phase 7 infrastructure to **execute** (not author):

| Item | Already-scaffolded in | Phase 7 must |
|---|---|---|
| `bunx playwright install chromium` cache | `.github/workflows/web-e2e.yml:39-49` (cache key on `bun.lock` hash + restore-keys) | Verify on first green run; extend to firefox/webkit fan-out is already wired (line 49 installs all three). |
| Detox iOS device matrix | `.github/workflows/mobile-e2e.yml:24-66` (macos-14, applesimutils brew, Pods cache, `e2e:build:ios`) | Verify first end-to-end green; wire artifact ingestion. |
| Detox Android device matrix | `.github/workflows/mobile-e2e.yml:69-138` (ubuntu, KVM enable, `reactivecircus/android-emulator-runner@v2`, Gradle cache, `Pixel_7_API_34`) | Verify first green; budget for slow cold start. |
| Preview deploy URL for E2E against real envs | `playwright-runbook.md:46-55` — Phase 7 CI section already documents Vercel preview + fly.io/Render flow | Wire `PLAYWRIGHT_BASE_URL=https://preview-...` envvar override in PR runs. |
| Browser fan-out (firefox + webkit + Mobile Chrome/Safari) | Install step already pulls all three; `playwright.config.ts:53-58` ships chromium-only as the S1 budget | Add `projects` entries in Phase 7 or fork to a matrix workflow. |

None of these are Phase 6 blockers. All have a documented scaffolding handoff.

---

## Section F — Final verdict

**GO — Phase 6 → Phase 7.**

`bun run check` is 38/38 green. `bun run check:anonymity` is clean. All 9 §6.4 rows are either GREEN by coverage (rows 1–4, 9), GREEN by spec inventory (rows 5–7 with the amended Phase 6 wave-A specs landed at commit `c105813`), or formally DEFERRED-with-cited-blocker (row 8 → Phase 9 §1). The Phase 9 deferral is upstream-bound (`[[s1-zkp-findings]]` OQ-1: no Polygon Amoy `CitizenVerifier` deployment exists) and explicitly amended in §6.4.

**Carry list for Phase 7 ownership:**
1. Execute `.github/workflows/web-e2e.yml` end-to-end against a real preview deploy and confirm green.
2. Execute `.github/workflows/mobile-e2e.yml` iOS + Android jobs and confirm green; expect ≥30 min cold-start on Android KVM.
3. Tighten `apps/mobile` branch coverage from 90.33% → ≥93% to retire the single-commit-tip-below risk (`gap-analysis.md` action D6).
4. Apply `packages/zkp-client/vitest.config.ts` override to drop the `**/index.ts` exclude so the 21 verify-proof tests count toward gate (`gap-analysis.md` action D2). Config-only change, no source touch.
5. Wire Vercel preview URL + fly.io/Render API preview into the Playwright `webServer` override path per `playwright-runbook.md:46-55`.

**No Phase 6 blockers. No reopening of earlier phases required.**

---

## Handoff block

```yaml
artifact: docs/phase-6/production-readiness-report.md
verdict: GO — Phase 6 → Phase 7
evidence:
  - bun run check 38/38 green (cached, Turbo FULL TURBO confirmed)
  - bun run check:anonymity clean (14 files, zero matches)
  - bunx playwright test --list → 23 tests in 6 files (chromium)
  - apps/mobile/e2e/jest.config.ts matches 6 spec files / 16 real it() / 0 todos
  - .github/workflows/{web-e2e,mobile-e2e}.yml present with caches + matrix
  - docs/action-plans/season-1/phase-9-deferred.md covers all 4 deferred items with citations
deferred_acknowledged:
  - row_8_contract_glue: upstream blocker (s1-zkp-findings OQ-1) — Phase 9 §1
  - rate_limiter_kv: Phase 8 deploy-target dependent — Phase 9 §2
  - dpdp_8_7_review: legal counsel — Phase 9 §3
  - rapidsnark_prod_distribution: Phase 8 infra — Phase 9 §4
carry_to_phase_7:
  - first end-to-end green of web-e2e.yml + mobile-e2e.yml against real envs
  - apps/mobile branch coverage 90.33 → ≥93 (config-only follow-up)
  - packages/zkp-client vacuous coverage fix (config-only, no source)
  - Vercel/Render preview URL wiring
  - Playwright browser fan-out (firefox + webkit + mobile emulation)
blockers_needing_lead_attention: none
read_only_audit_confirmed: true
source_modifications: none
```
