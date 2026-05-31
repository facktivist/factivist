# Phase 9 Checklist — User Testing & Production-Side Validation

**Status:** ACTIVE 2026-05-26.
**Owner:** maintainer (single-maintainer S1 baseline).
**Companion docs:** [`phase-9-deferred.md`](./phase-9-deferred.md) (scope + rationale + cited sources) · [`s1-action-plan.md`](./s1-action-plan.md) §9 (phase contract) · [`docs/operations/deploy-runbook.md`](../../operations/deploy-runbook.md) (secrets + workflow contract) · [Phase 8 done memo](../../../.claude/projects/-Users-allan-Projects-factivist/memory/pattern_s1_phase_8_done.md) (what shipped, what's deferred).

This file is the **doer's checklist**: every Phase 9 item, in execution order, with the exact commands or dashboard clicks needed to complete it. Items are grouped by what's blocking them; each group can run in parallel.

---

## How to use this checklist

1. Tackle **Group A** (activations of code already shipped) first — they unblock the rest and surface infra problems early.
2. Run **Group B** (user-side provisioning) in the listed order. Each step has prerequisites from the step above (e.g. Cloudflare DNS depends on owning the domains).
3. **Group C** (long-lead) starts in parallel with B because Solidity audit + legal counsel both have multi-week lead times.
4. **Group D** (post-launch gates) closes the Phase 8 exit gate after the first deploy + 60 days of operation.
5. **Group E** (test-infra follow-ups) is cleanup that can land any time but should not block the launch.

Tick each box as you complete it; PR commits closing items should link back to the specific checkbox.

---

## Group A — Activate already-shipped code

These don't need any new account or commercial spend; just configuration of code that's already on `feat/season-1-orchestration`.

### A1. Push the Phase 8 / Phase 9 branch

- [x] `git push origin feat/season-1-orchestration`
- [x] Open a PR against `main` titled `feat(s1): phase 8 + phase 9 code-complete`.
- [ ] CI must come back green (38/38). If not, fix before continuing.
- [ ] Merge to `main` after self-review (Phase 9 §5.1 raises the reviewer count to 2 once a second collaborator joins; S1 baseline = 1).

### A2. Mobile Sentry — native rebuild

`@sentry/react-native` is a native module; CI does not run `expo prebuild`.

- [x] `cd apps/mobile && bun run native:prebuild` (one-time local regeneration of `ios/` + `android/`).
- [x] Re-run the Detox debug builds: `bun run e2e:build:ios && bun run e2e:build:android`.
- [ ] Confirm Detox suites still pass: `bun run test:e2e:ios` and `bun run test:e2e:android`.
- [x] Set `EXPO_PUBLIC_SENTRY_DSN` in EAS secrets (see B7 below). Without the DSN, `initSentry()` no-ops.

### A3. Apply migration `0004_enable_rls.sql` to production

Closes the H-01 RLS gap surfaced by the Phase 8 §8.6 audit.

- [ ] Visit GitHub → Actions → **db-migrate** → Run workflow.
- [ ] Environment: `production`. Confirm: type `YES MIGRATE`.
- [ ] Approve the environment gate when prompted (second reviewer required from Phase 9 onward).
- [ ] Verify in the run log that `0004_enable_rls.sql` is listed under "Applied migrations".
- [ ] Spot-check from a Supabase SQL shell: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';` — every citizen-touching table should show `rowsecurity = true`.

### A4. Apply migration `0005_dpdp_grievance_contacts.sql` to production

**Gated on:** legal counsel sign-off (Group C, step C2). Do **not** apply before counsel confirms the 365-day audit floor + 30-day post-resolve PII window.

- [ ] Counsel sign-off received (C2 done).
- [ ] Run `db-migrate` → `production` → `YES MIGRATE`.
- [ ] Spot-check: `\d grievance_contacts` shows the table; `SELECT count(*) FROM grievance_contacts;` returns 0 (S1 has no production grievances yet).

### A5. Pin rapidsnark version in deploy workflows

- [ ] Pick a tag from https://github.com/iden3/rapidsnark/releases (e.g. `v0.0.10`).
- [ ] Get the SHA-256 of the `rapidsnark-linux-x86_64.tar.gz` asset:
  ```bash
  curl -L -o /tmp/r.tgz \
    https://github.com/iden3/rapidsnark/releases/download/<TAG>/rapidsnark-linux-x86_64.tar.gz
  sha256sum /tmp/r.tgz
  ```
- [ ] Edit `.github/workflows/deploy-staging.yml` and `deploy-prod.yml` — append two `--build-arg` flags to the `flyctl deploy` step:
  ```
  --build-arg RAPIDSNARK_VERSION=<TAG>
  --build-arg RAPIDSNARK_SHA256=<HEX>
  ```
- [ ] Open a PR with the workflow edit, merge after CI is green.
- [ ] Next deploy bakes the binary at `/opt/zkp/rapidsnark` and sets `FACTIVIST_ZKP_PROVER_BIN` automatically.

### A6. Upload `citizen.zkey` + `citizen.wasm` to Supabase Storage

Production rapidsnark needs the proving artifacts. Image stays small because we fetch at boot, not bake at build.

- [ ] In the Supabase dashboard, create a **private** bucket `zkp-artifacts`.
- [ ] Upload `citizen.zkey` and `citizen.wasm` (from the AnonCitizen ceremony output).
- [ ] Generate a signed URL valid for 1 hour for each artifact.
- [ ] Add a Fly init script (or extend the Dockerfile `CMD`) that:
  1. Fetches both URLs to `/opt/zkp/citizen.zkey` and `/opt/zkp/citizen.wasm`.
  2. Verifies SHA-256 against `packages/shared/src/constants/zkp.ts` (file lands as part of Phase 9 §1 wiring — until then trust the on-disk file).
  3. Exports `FACTIVIST_ZKP_ZKEY_PATH=/opt/zkp/citizen.zkey` and `FACTIVIST_ZKP_WASM_PATH=/opt/zkp/citizen.wasm`.
- [ ] Re-deploy and verify `/identity/prove` no longer returns `503 PROVER_NOT_CONFIGURED`.

---

## Group B — User-side provisioning

Execute in order; each step depends on the ones above. Total time ≈ 5 hours of focused work. Costs are **recurring monthly** unless marked otherwise.

### B1. GitHub repo secrets + `production` environment

Time: 32 min. Cost: $0.

- [ ] Open repo → Settings → Environments → New environment → **`production`** → Required reviewers: **1** (S1 baseline). Apps that read it: `deploy-prod.yml` + `db-migrate.yml#migrate-production`.
- [ ] Open repo → Settings → Secrets and variables → Actions → New repository secret. Add the 13 secrets from [`deploy-runbook.md`](../../operations/deploy-runbook.md) "Required GitHub repository secrets" table — both the staging and prod sets.
- [ ] Smoke check: re-run the latest `deploy-staging.yml` and confirm all three jobs emit deploy URLs (or, if accounts aren't ready, a `::notice::` skip).

### B2. Vercel Pro project for `apps/web`

Time: 20 min. Cost: **$20/mo**.

- [ ] Sign up at https://vercel.com (or use an existing team).
- [ ] Create a new project; root directory = `apps/web`; framework preset = Next.js; install command = `bun install`; build command = `bun run build`.
- [ ] Upgrade the project's team to **Pro** ($20/mo) — required for the bom1 region pin in `apps/web/vercel.json`.
- [ ] Settings → Git → Enable **Preview Branch Protection** (no anonymous deploys from forks).
- [ ] Copy `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` into GitHub secrets (B1). For prod, use the `_PROD` suffix.

### B3. Fly.io account + two API apps

Time: 30 min. Cost: **$10/mo** (single shared-cpu-1x).

- [ ] Sign up at https://fly.io and install `flyctl`.
- [ ] `flyctl apps create factivist-api-staging --org <org>`
- [ ] `flyctl apps create factivist-api-prod --org <org>`
- [ ] Allocate v4 + v6 IPs for each: `flyctl ips allocate-v4 -a factivist-api-prod` (and v6 + staging).
- [ ] Create an org-scoped token: `flyctl tokens create org` → store in GitHub secrets as `FLY_API_TOKEN` + `FLY_API_TOKEN_PROD`.
- [ ] Set the app name secrets: `FLY_APP_NAME=factivist-api-staging` + `FLY_APP_NAME_PROD=factivist-api-prod`.

### B4. Supabase Pro + custom domain

Time: 60 min. Cost: **$25/mo**.

- [ ] Create one Supabase project for staging, one for prod (Pro plan on prod minimum). Region: **Mumbai (ap-south-1)**.
- [ ] Per [`ADR-009`](../../adr/0009-supabase-custom-domain.md): in each project, Settings → Custom domains → add `api-staging.factivist.<tld>` and `api.factivist.<tld>`. Required, not optional (India ISP mitigation).
- [ ] Copy each project's `DATABASE_URL` (the writable pooler URL) into GitHub secrets: `DATABASE_URL_STAGING` + `DATABASE_URL_PROD`.
- [ ] Configure the Storage `complaint-photos` bucket: private, 10 MiB cap, MIME allowlist (mirrors `supabase/config.toml`). Set `SUPABASE_STORAGE_WEBHOOK_SECRET` per [`pattern_s1_phase_5_wave_2_done`](../../../.claude/projects/-Users-allan-Projects-factivist/memory/pattern_s1_phase_5_wave_2_done.md).
- [ ] Generate JWT signing keys; add `SUPABASE_JWKS_URL` env to Fly secrets.

### B5. Cloudflare account + 3 domains + API token

Time: 45 min. Cost: $0/mo recurring + **~$80/yr** in domain registration.

- [ ] Sign up at https://cloudflare.com.
- [ ] Buy three domains (`.org`, `.io`, `.is`) — any registrar; pointing nameservers at Cloudflare is what matters.
- [ ] Add each domain to Cloudflare; point nameservers at the assigned Cloudflare set.
- [ ] DNS → For each domain: create A/AAAA records pointing to Vercel + a CNAME `api` pointing to the Fly app. **Proxy: ON** for every record.
- [ ] My Profile → API Tokens → Create Token → template "Edit zone DNS" → scope to the three zones → save to `~/.factivist/cf-token` (chmod 600). This is read by `docs/operations/runbook-ddos.md` and the DR drill.
- [ ] Confirm `https://factivist.<tld>/healthz` resolves to the Fly app behind Cloudflare proxy (orange-cloud icon).

### B6. EAS account + project IDs in `eas.json`

Time: 30 min. Cost: **$19/mo** (EAS Starter) + **$99/yr** (Apple Developer) + **$25 one-shot** (Google Play Console).

- [ ] Sign up at https://expo.dev. Upgrade to EAS Starter ($19/mo).
- [ ] `bunx eas init` from `apps/mobile/` → links the slug `factivist-mobile`.
- [ ] Paste Apple Team ID + ASC App ID + Google Play Service Account JSON path into `apps/mobile/eas.json` (the file ships with placeholders).
- [ ] Add the three GitHub secrets: `EXPO_TOKEN`, `EXPO_PROJECT_ID`, `EAS_PROJECT_ID` (+ `_PROD` variants).
- [ ] Run `bunx eas build --profile preview --platform ios` once to verify the EAS pipeline; the build can succeed but go nowhere — we just want the credential chain validated.

### B7. Sentry org + 3 projects + DSNs in vaults

Time: 20 min. Cost: $0 (free tier covers S1).

- [ ] Sign up at https://sentry.io → create an org (free tier).
- [ ] Create three projects: `factivist-web` (platform: Next.js), `factivist-api` (Node.js), `factivist-mobile` (React Native).
- [ ] Copy each DSN:
  - `SENTRY_DSN` (api) → Fly secrets via `flyctl secrets set SENTRY_DSN=... -a factivist-api-prod` (and staging).
  - `SENTRY_DSN` (web) + `NEXT_PUBLIC_SENTRY_DSN` (web) → Vercel project env vars (prod + preview).
  - `EXPO_PUBLIC_SENTRY_DSN` (mobile) → EAS secrets via `bunx eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value ...`.
- [ ] Trigger a deliberate error in each surface to confirm Sentry receives it and the PII scrubber strips email/phone/Aadhaar/photo paths.

### B8. Upstash Redis (Mumbai) for rate limiter

Time: 15 min. Cost: $0 (free tier covers 10k commands/day; S1 needs ~144/day).

- [ ] Sign up at https://upstash.com.
- [ ] Create a Redis database in region **Mumbai (ap-south-1)**, eviction policy `noeviction`.
- [ ] Copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` from the dashboard.
- [ ] `flyctl secrets set UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... -a factivist-api-prod` (and staging).
- [ ] Re-deploy the API (or wait for the next push). On boot, `selectProveRateLimiter()` auto-switches to the Upstash backend; no code change.
- [ ] Verify: hit `/identity/prove` 11× within 60s from one IP across two pods — the 11th must `429 RATE_LIMITED`. Pre-Upstash the cap would have been 20 = 10 × 2 pods; post-Upstash it stays at 10.

### B9. Cloudflare Workers — uptime cron deploy

Time: 15 min. Cost: $0 (free tier covers <100k req/day).

- [ ] Install wrangler: `bun add -g wrangler` (or use `bunx wrangler@latest`).
- [ ] `cd apps/api && bunx wrangler login` (one-time browser flow).
- [ ] Set the webhook secret: `bunx wrangler secret put UPTIME_WEBHOOK_URL` (paste a Slack/Discord/PagerDuty webhook URL).
- [ ] (Optional) `bunx wrangler secret put UPTIME_WEBHOOK_SECRET` for HMAC-signed pings.
- [ ] Deploy: `bunx wrangler deploy`. Cron schedule (5-min parity) is already in `wrangler.toml`.
- [ ] In the Cloudflare dashboard, confirm the Worker fires every 5 min and reports the configured `UPTIME_TARGETS` URLs.

---

## Group C — Long-lead items (start in parallel with Group B)

### C1. Polygon 3/5 Safe multisig + fund

Time: 2 hours setup. Cost: ~$60 one-shot (deploy gas) + recurring within $113/mo budget.

- [ ] Set up a 3/5 Safe at https://app.safe.global on **Polygon PoS mainnet**. Owners: maintainer + 4 trusted parties.
- [ ] Fund the Safe with enough MATIC for `CitizenVerifier.sol` deployment + 6 months of verify gas (Phase 2 reconciliation: $18.76/mo at standard congestion → ~$112 / 6 mo).
- [ ] Document the Safe address + signer public keys in a new ADR (or amend [`ADR-011`](../../adr/0011-hybrid-zkp-stack-per-platform.md) if appropriate).

### C2. CitizenVerifier integration audit

Time: 30 min outreach + 1–2 week audit window. Cost: **$3,000–$10,000 one-shot**.

- [ ] Pick a reviewer: Code4rena Solo (cheapest), Cantina ($-tier), or a boutique Solidity firm.
- [ ] Brief them on the scope: integration glue only (we are NOT the authors of `CitizenVerifier.sol` — that's AnonCitizen upstream). Specifically:
  - `apps/api/src/lib/citizen-verifier.ts` viem wiring (lands once Group D fires)
  - The signer-set governance flow (who can call `verifyAndRecord`)
  - The nullifier replay handling vs the on-chain `nullifierUsed[]` mapping
- [ ] Receive the report. §8.8 exit gate requires **no high or critical findings open**. File issues for any medium / low findings before the first prod release tag.

### C3. Legal counsel for DPDP §3 sign-off

Time: 30 min counsel briefing + counsel turnaround (typically 1–2 weeks). Cost: depends on counsel — budget separately from the Phase 8 monthly.

- [ ] Brief retained counsel using [`phase-9-deferred.md`](./phase-9-deferred.md) §3 (cited DPDP sources are in the doc).
- [ ] Confirm: 365-day audit_log floor satisfies DPDP Rules 2025 Rule 8(3) + CERT-In 180-day minimum (stricter wins).
- [ ] Confirm: 30-day post-resolve erasure window on `grievance_contacts` satisfies DPDP §8(7) ("erase once purpose served").
- [ ] Confirm: `sha256(complainant_email)` in `audit_log.rationale` is acceptable as an immutable, non-recoverable record-of-action.
- [ ] If counsel disagrees on any number: change `AUDIT_LOG_RETENTION_DAYS` in `packages/db/src/schema/audit_log.ts` and/or `GRIEVANCE_CONTACTS_ERASE_AFTER_DAYS` in `grievance_contacts.ts`; both are exported constants → one-place edit.
- [ ] Counsel sign-off received → unlocks A4 (apply migration 0005).

### C4. Watch for AnonCitizen `CitizenVerifier.sol` deployment

Time: passive watch + 1–2 days wiring once the address lands.

- [ ] Subscribe to https://github.com/anoncitizen/contracts (Watch → Releases).
- [ ] Once a Polygon Amoy testnet deployment exists: open an issue + ping Claude to wire `apps/api/src/lib/citizen-verifier.ts` (viem `verifyAndRecord` call) + the Hardhat contract glue in `packages/contracts/test/CitizenVerifier.t.ts`. Per [`phase-9-deferred.md`](./phase-9-deferred.md) §1 this becomes a single-commit follow-up triggered by you posting the deployed address.
- [ ] Once a Polygon PoS mainnet deployment exists: deploy from the §C1 Safe; update the contract address in API env.

---

## Group D — Post-launch operational gates (close Phase 8 §8.8 exit gate)

Cannot start until at least Group A + Group B are complete and the first prod deploy has gone out.

### D1. First disaster-recovery drill

Time: ≤ 30 min (budget for the drill itself). Cost: $0.

- [ ] Pick a Friday afternoon (low traffic). Announce the drill in `#ops` or wherever you keep ops comms.
- [ ] Execute end-to-end per [`docs/operations/dr-drill-s1.md`](../../operations/dr-drill-s1.md): nuke the Fly app → recreate from the secrets manifest → fresh tag deploy → optional Supabase PITR → verify `/healthz`.
- [ ] Time each step. Total must be < 30 min (Phase 8 §8.8 exit-gate item 4).
- [ ] Append a results row to the "Drill log" section at the bottom of `dr-drill-s1.md`: `{date, start_ts, end_ts, duration_min, anomalies, sign_off}`.

### D2. Two-month cost reconciliation

Time: 30 min per month × 2 months. Cost: $0.

- [ ] Wait for two complete billing cycles post-launch (e.g. 2026-06 + 2026-07 invoices).
- [ ] Pull invoices from Stripe (Vercel + EAS), Fly.io, Supabase, Upstash, Polygon RPC provider.
- [ ] Sum the monthly total. Must be **≤ $115** (Amber ceiling per [`s1-action-plan.md`](./s1-action-plan.md) §8.8 amended on 2026-05-25).
- [ ] Append a row to [`docs/data-points/s1-cost-reconciliation-phase-8.md`](../../data-points/s1-cost-reconciliation-phase-8.md) §7 for each month.
- [ ] If breached: file a `risk:budget` issue per [`reference_s1_cost_drift`](../../../.claude/projects/-Users-allan-Projects-factivist/memory/reference_s1_cost_drift.md). Update `[[s1-cost-drift]]` memory if drift exceeds 15% sustained.

---

## Group E — Test-infrastructure follow-ups (parallel with everything)

These don't block the launch but should land before declaring Phase 9 closed.

### E1. RLS policy coverage test — DONE 2026-05-26

The Phase 8 audit removed the broken reference to `packages/db/__tests__/rls.test.ts`. The test now lives at `packages/db/src/__tests__/rls.test.ts` and parses the SQL migrations as source of truth — fails closed if a new citizen-touching table lands without an RLS flip.

- [x] Create `packages/db/src/__tests__/rls.test.ts` — landed in the Wave 4a comments-table sweep.
- [x] For every table that touches citizen data, assert via the Drizzle snapshot that `isRLSEnabled` is true + at least one policy exists per CRUD operation (or an explicit `default-deny` marker).
- [x] Wired into the existing CI matrix via `bun run check` (38/38).

### E2. Threat-model link sweep — DONE 2026-05-26

`docs/architecture/threat-model.md:127` already references the new path (`packages/db/src/__tests__/rls.test.ts`) under the RLS-misconfiguration row. No other broken `packages/db/__tests__/*.test.ts` references survive in the threat model.

- [x] Verified no broken `packages/db/__tests__/*.test.ts` references survive the Phase 8 fix-up.

### E3. Phase-9 done memory

- [ ] When Groups A + B + C2 + C3 are all green: write `pattern_s1_phase_9_done.md` in `~/.claude/projects/-Users-allan-Projects-factivist/memory/`.
- [ ] Add a line to `MEMORY.md`.
- [ ] Include: which Phase-8 §8.8 exit-gate items are now PASS, which AnonCitizen items remain external-blocked, current monthly cost actual, signer-set hashes, audit report digest.

---

## Tracker

A live status table — update as each item completes. Counts at the bottom.

| Group | Item | Status | Notes |
|-------|------|--------|-------|
| A1 | Push branch + open PR | ☐ | |
| A2 | Mobile Sentry native rebuild | ☐ | |
| A3 | Apply migration 0004 (RLS) | ☐ | |
| A4 | Apply migration 0005 (grievance_contacts) | ☐ | Blocked on C3 |
| A5 | Pin rapidsnark version in workflows | ☐ | |
| A6 | Upload zkey/wasm to Supabase Storage | ☐ | Needs B4 |
| B1 | GitHub secrets + production env | ☐ | |
| B2 | Vercel Pro project | ☐ | |
| B3 | Fly.io apps (staging + prod) | ☐ | |
| B4 | Supabase Pro + custom domain | ☐ | |
| B5 | Cloudflare + 3 domains + token | ☐ | |
| B6 | EAS account + Apple/Play IDs | ☐ | |
| B7 | Sentry org + 3 DSNs | ☐ | |
| B8 | Upstash Redis (Mumbai) | ☐ | |
| B9 | Cloudflare Workers uptime deploy | ☐ | Needs B5 |
| C1 | Polygon 3/5 Safe + fund | ☐ | |
| C2 | CitizenVerifier audit | ☐ | $3-10k one-shot |
| C3 | Counsel sign-off on DPDP §3 | ☐ | Unblocks A4 |
| C4 | Wire on-chain verifyAndRecord | ☐ | Blocked on AnonCitizen upstream |
| D1 | First DR drill < 30 min | ☐ | After first prod deploy |
| D2 | Two-month cost reconciliation | ☐ | After 60d of prod |
| E1 | RLS coverage test | ✅ | Closed 2026-05-26 by Wave 4a (`packages/db/src/__tests__/rls.test.ts`) |
| E2 | Threat-model link sweep | ✅ | Closed 2026-05-26 — `threat-model.md:127` points at the new path |
| E3 | Phase-9 done memory | ☐ | After A + B + C2 + C3 |

**Done:** 0 / 24
**Blocked by external:** 1 (C4 on AnonCitizen)
**Blocked by counsel:** 1 (A4 on C3)
**Blocked by commercial:** 1 (C2 audit engagement)

---

## When can Phase 9 close?

Phase 9 closes when:

- [ ] Groups A + B + E are 100%.
- [ ] Group C: C1 done, C2 returns "no high/critical findings", C3 received and migration 0005 applied (A4 closed). C4 is allowed to remain open at S1 close — see [`s1-action-plan.md §9`](./s1-action-plan.md) exit gate.
- [ ] Group D: D1 done with a clean drill row. D2 has two consecutive green months.
- [ ] `pattern_s1_phase_9_done.md` memory is in place + MEMORY.md updated (E3).

At that point S1 is launch-ready and the swarm can begin S2 graduation (see [`s1-action-plan.md §"S1 → S2 Graduation Triggers"`](./s1-action-plan.md)).
