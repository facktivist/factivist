# Factivist — S2 Mainnet & Growth — Action Plan

> **Scope:** Execute the **S2** scenario from
> [`docs/product/cost-scenarios.md`](../../product/cost-scenarios.md), closing
> the Phase 2 + Phase 3 + Phase 4 items in
> [`docs/product/product-vison.md`](../../product/product-vison.md) §5 that
> S1 deliberately deferred.
>
> **Budget envelope:** ≈ $400–800 / mo (S2 scale, ~50k–250k MAU) +
> $15–40k one-time (multi-contract audit bundle) per
> `docs/product/cost-scenarios.md`. Watchpoints: Polygon gas (post-Chicago
> baseline pinned by `[[s2-polygon-gas]]`), Meilisearch hosting, IPFS pin
> cluster fan-out.
>
> **Outcome:** Full complaint lifecycle (status → resolution attestation),
> accused / leader profiles, judicial tracking, public API, multi-language
> shell, iOS native, PWA offline, on-chain anchoring on Polygon mainnet via
> the audited `ComplaintRegistry`, community moderator pool, DAO
> governance pilot, and the 20 new design screens shipped in the
> 2026-05-26 Claude Design refresh.

This document is **structured the same way as
[`../season-1/s1-action-plan.md`](../season-1/s1-action-plan.md)** — Phase
1 (research) through Phase 9 (user testing). Read the S1 plan first; this
plan only restates what differs.

---

## Tooling Choices

Unchanged from S1 (Bun + Drizzle + Supabase + Polygon + EAS + GitHub
Projects + Wiki + Claude Design + GitHub Actions). New in S2:

| Concern | Tool | Notes |
|---------|------|-------|
| Full-text search | **Meilisearch** | Self-host on Fly.io (~$15/mo) per product-vision §2.7. Was deliberately deferred from S1 — citizens get Postgres `ilike` until S2. |
| On-chain anchoring | **Polygon PoS mainnet** | S1 ran Postgres-only replay check. S2 wires `ComplaintRegistry.anchor()` after Phase 9 audit closes (see [[s1-zkp-findings]] OQ-1 + [[s2-polygon-gas]]). |
| IPFS pinning | **Multi-region pin cluster** (web3.storage primary + Filebase + self-hosted Filebase mirror) | Phase 4 vision §"Multiple IPFS pinning nodes across jurisdictions". |
| i18n | **next-intl** + `@formatjs/intl` | Web + native share the same message catalogues from `packages/shared/src/i18n/`. |
| DAO governance | **Snapshot.org** (off-chain v1) → on-chain Governor in S3 | S2 ships off-chain Snapshot space — gas-free, audited governance UI; on-chain promotion is S3. |
| AI moderation tuning | **Llama Guard 3 fine-tunes** on opt-in S1 corpus | Phase 4 vision §"Fine-tune moderation models". |

---

## 0. Operating Model — Same Ruflo + SendMessage swarm as S1

See [`../season-1/s1-action-plan.md`](../season-1/s1-action-plan.md) §0.
S2 changes nothing about the topology, naming, or memory contract.

Memory key prefix: `s2-…` (e.g. `s2-phase-2-done`). Cross-reference S1
memory via `[[s1-…]]` links.

---

## Carry-over from S1 (must close before S2 Phase 5 starts)

These are **S1 Phase 9 items** tracked in
[`../season-1/phase-9-deferred.md`](../season-1/phase-9-deferred.md) +
[`../season-1/phase-9-checklist.md`](../season-1/phase-9-checklist.md). S2
inherits them as hard preconditions, not as new scope:

| S1 carry-over | Why S2 blocks on it | Section in S1 phase-9 |
|---|---|---|
| `CitizenVerifier.sol` Polygon Amoy + mainnet deploy | S2 wires `ComplaintRegistry` on top; the verifier must exist first | §1 |
| `ComplaintRegistry.sol` audit (multi-contract bundle) | The Phase 9 single-contract audit was for the verifier only; S2 needs a fresh audit bundle covering registry + governance contracts. $15–40k one-time | new (this plan §11) |
| Upstash rate limiter activation | S2 scale (50k+ MAU) makes the in-memory fallback dangerous | §2 |
| Counsel sign-off on DPDP §8(7) + IT Act §3(2) right-of-reply window | S2 ships the right-of-reply portal — UI cannot land before counsel locks the SLA | §3 |
| Polygon 3/5 Safe multisig + on-chain anchoring fund | S2 anchoring spend = ~$5–25/mo at S2 MAU per `cost-scenarios.md` | §6 |

If any of these slips, S2 Phase 5 cannot start. Do **not** parallelise.

---

## Phase 1 — Project Research & Planning

| Deliverable | Owner agent | Output |
|---|---|---|
| Audit-vendor shortlist for the multi-contract bundle | `researcher` | Wiki page `Research-S2-Audit-Vendors` |
| Meilisearch hosting + sharding research at S2 MAU | `researcher` + `perf-engineer` | Wiki page `Research-S2-Meilisearch` |
| Snapshot.org space schema (proposal types, vote weights, threshold model) | `researcher` + `system-architect` | Wiki page `Research-S2-DAO-Snapshot` |
| IPFS pin-cluster multi-jurisdiction layout (web3.storage primary, Filebase secondary, self-hosted Filebase tertiary) | `researcher` | Wiki page `Research-S2-IPFS-Cluster` |
| Right-of-reply window per IT Act §3(2) — confirm 14 days with counsel | `researcher` | Wiki page `Research-S2-Right-Of-Reply` |
| Multi-language baseline: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu — which one is the v1 target, ICU plural rules, RTL handling for Urdu | `researcher` | Wiki page `Research-S2-i18n` |
| Sub-Constitution analytics dataset — what aggregates can ship without re-identifying complainants | `researcher` + `security-architect` | Wiki page `Research-S2-Analytics-Privacy` |

**Exit gate:** 7 wiki pages green; `cost-scenarios.md` re-baselined against
Phase 1 findings; `pattern_s2_phase_1_done.md` memory note written.

---

## Phase 2 — Token Cost & Usage Analysis

S1 nailed a $113/mo total at 1k MAU. S2 must produce an equivalent figure
for the S2 scale band (50k → 250k MAU). Owner: `cost-analyst`.

Hard items:
- **Polygon gas at S2 MAU** — extend the existing
  `scripts/polygon-gas/measure-verify.ts` to also benchmark the
  `ComplaintRegistry.anchor()` call (currently not deployed). Re-run
  against the latest Polygon network state and update [[s2-polygon-gas]].
- **Meilisearch hosting cost** — Fly.io vs DigitalOcean vs self-hosted on
  the existing Fly.io API VM. Output as a row in `cost-scenarios.md` S2
  column.
- **IPFS cluster cost** — web3.storage's free tier ceiling vs paid
  Filebase + bandwidth at S2 scale.
- **iOS App Store + Apple Dev fee** ($99/yr) — fixed line in
  `cost-scenarios.md`.
- **LLM cost re-baseline** with Phase 5+ telemetry (`scripts/cost/zkp-route-events-weekly.ts`
  output + `dev_metrics.llm_calls`).

**Exit gate:** `docs/data-points/s2-cost-baseline.md` written, P50 + P95
ranges for each cost line, two-month reconciliation cadence agreed.

---

## Phase 3 — Project Design

S2 inherits the 9 S1 surfaces (already shipped to `packages/ui/{web,native}`).
The Claude Design 2026-05-26 refresh added **20 new screens** which become
the S2 surface set. They split into three buckets:

### 3.1 The 6 S1-extension surfaces (must land first; they finish loops the S1 UI references)

| # | Surface | JSX prototype | S1 surface it extends | Compound to author |
|---|---------|---------------|----------------------|---------------------|
| E1 | Anchor-receipt modal — tx hash, Merkle path, nullifier proof, "verify it yourself" steps | `screens/anchor-receipt.jsx` | S01 (onboarding success) + S03 (complaint detail) | `Anchor.*` compound — `Receipt`, `MerklePath`, `VerifyInstructions` |
| E2 | Account-settings sub-page — recovery-key display, language, notification prefs, danger zone | `screens/account-settings.jsx` | S06 (profile) | extends `Profile.*` with `Profile.Settings.*` slots |
| E3 | Recovery-redeem flow — 24-word seed → restore-on-new-device, 4-phone story | `screens/recovery-redeem.jsx` | S01 (onboarding) | `Onboarding.RecoverFlow.*` — `SeedEntry`, `Confirming`, `Restored` |
| E4 | PWA install + offline draft queue + sync banner | `screens/pwa-offline.jsx` | S09 (app-shell) | `Shell.PwaInstall`, `Shell.OfflineDraftQueue`, `Shell.SyncBanner` |
| E5 | Moderator profile pane | `screens/moderator.jsx` | S07 (moderation queue) | `Moderation.OperatorProfile` |
| E6 | Citizen-view of anchored official reply on complaint detail | `screens/gaps-citizen.jsx` (top half) | S03 (complaint detail) | `Complaint.OfficialReply.*` — `ReplyBlock`, `UnlocksFooter` |

### 3.2 The 2 legally-relevant surfaces (gated on counsel sign-off)

| # | Surface | JSX prototype | Compound |
|---|---------|---------------|----------|
| L1 | Data-export wizard — DPDP §11(2) portability + RTI-activist bulk export, 4 steps (Scope → Format → Review → Receipt), IPFS + magnet delivery | `screens/data-export.jsx` | `Export.Wizard.*` |
| L2 | Right-of-reply portal — IT Act §3(2) accused/official inbox + composer + 14-day reply timer + anchored past replies | `screens/right-of-reply.jsx` + `screens/gaps-mobile.jsx#MobileRightOfReply` + `screens/gaps-citizen.jsx#CitizenView` | `RightOfReply.*` — `OfficialInbox`, `Composer`, `Timer`, `AnchoredHistory` |

### 3.3 The 12 fresh S2 surfaces (Phase 2-4 vision items)

| # | Surface | JSX prototype | Compound |
|---|---------|---------------|----------|
| F1 | Accused / Person-of-Interest profile | `screens/accused.jsx` | `Accused.*` |
| F2 | Leader history + report card | `screens/leader-history.jsx` + `screens/report-card.jsx` | `Leader.*` — `History`, `ReportCard`, `ShareableCard` |
| F3 | Promise / manifesto tracking | `screens/promise-tracking.jsx` | `Promise.*` — `Tracker`, `DeepView` (mobile in `mobile-finishers.jsx`) |
| F4 | Judicial case tracker (undertrial + judicial) | `screens/judicial.jsx` + `screens/undertrial.jsx` | `Judicial.*` |
| F5 | Analytics dashboard (heat maps + aggregates) | `screens/analytics.jsx` + `screens/shame-index.jsx` + `screens/india-map.jsx` | `Analytics.*` — `Dashboard`, `Heatmap`, `ShameIndex`, `IndiaMap` |
| F6 | Constituency deep-explorer | `screens/constituency.jsx` | `Constituency.Explorer.*` |
| F7 | DAO governance — proposals, voting bar, treasury panel, current cycle | `screens/dao-governance.jsx` + `screens/gaps-mobile.jsx#MobileDao` | `Dao.*` — `ProposalList`, `Vote`, `Treasury`, `Cycle` |
| F8 | Public API docs site (Stripe-style 3-col reader) | `screens/api-docs.jsx` | `ApiDocs.*` |
| F9 | API console / playground | `screens/api-console.jsx` | `ApiConsole.*` |
| F10 | i18n shell — language picker + translator contributor queue | `screens/language.jsx` + `screens/translate.jsx` | `I18n.Picker`, `I18n.Contributor.*` |
| F11 | Election-season landing + watchdog alerts | `screens/election-season.jsx` + `screens/gaps-mobile.jsx#MobileElection` + `screens/gaps-mobile.jsx#WatchdogAlerts` | `Election.*` — `Landing`, `MobileAlerts` |
| F12 | Help / FAQ / press kit / security + universal error states (404 / 451 / 503 / maintenance) + press-tier application form | `screens/help-press.jsx` + `screens/gaps-misc.jsx` | `Help.*` + `Errors.*` + `Press.Application` |

### 3.4 Mobile companions + iOS pass

`screens/mobile-batch3.jsx`, `mobile-extras.jsx`, `mobile-finishers.jsx`,
`mobile-companions.jsx` carry phone surfaces for every desktop section
above. `gaps-mobile.jsx` adds an iOS-frame re-render of the existing
Android-frame mocks. S2 ships **iOS native** (S1 was Android-only).

### 3.5 Tokens

No primitive churn expected. The S1 token set
(`packages/ui/theme/src/tokens/colors.ts`) is already pinned. If a new
semantic alias is needed (e.g. `--color-anchor-receipt`), add it to all
three sources of truth in the same commit (theme TS, Tailwind preset,
design-system CSS).

### 3.6 Exit gate

- All 20 JSX prototypes have a `Surface-XX-name.md` spec in
  `docs/design/s2/surfaces/` modelled on `docs/design/s1/surfaces/01-onboarding.md`.
- Token reconciliation test pinned.
- A11y baseline extended to cover every new surface at AA, AAA opt-in for
  composer + legal + right-of-reply per ADR-021.
- `pattern_s2_phase_3_done.md` written.

---

## Phase 4 — Project Architecture

S2 ratifies the ADRs that S1 deferred + the new ones the design demands.

| ADR | Topic | Why now |
|---|---|---|
| ADR-022 | `ComplaintRegistry.sol` schema + anchoring lifecycle | Replaces the Postgres-only model from S1 |
| ADR-023 | DAO governance: Snapshot.org space + on-chain promotion path | New surface |
| ADR-024 | i18n string-catalogue + locale negotiation (server vs client) | New surface |
| ADR-025 | Right-of-reply identity gating — how an "official" Aadhaar is proven distinct from a citizen Aadhaar without leaking either | IT Act §3(2) + ADR-010 anonymity floor |
| ADR-026 | Recovery-key custody — 24-word seed → nullifier restore semantics; what data we ship on the device vs server-side; what an attacker with the seed CAN do | Crypto-sensitive — overrides part of [[s1-zkp-findings]] |
| ADR-027 | Public API design — auth (press tier vs anon), rate limiting, scope tokens, abuse | New surface |
| ADR-028 | IPFS cluster policy — which pinner has authoritative copies, garbage-collection rules, replication factor | Phase 4 vision §"Multiple IPFS pinning nodes" |
| ADR-029 | Analytics privacy budget — k-anonymity floor for every aggregate that ships to the public dashboard | Sub-Constitution exposes citizen aggregates — must not enable re-identification |
| ADR-030 | iOS native ZKP prover — rapidsnark for iOS vs server-fallback parity with Android | Phase 3 vision §"iOS app" |

Output: every ADR in `docs/adr/0022..0030`, every architecture doc in
`docs/architecture/` extended with the S2 bounded contexts (Anchoring,
Governance, Analytics, Judicial, Press).

---

## Phase 5 — Development

Five workstreams, each its own swarm. Ordered so the dependency edges
flow Reg → Anchoring → Governance, and Discovery → Search → Analytics.

### 5.1 Workstream A — Mainnet anchoring + Phase 9 carry-over closure

- Implement `ComplaintRegistry.sol` (Solidity) + Hardhat test suite at
  `packages/contracts/`. Test coverage gate ≥ 95% lines.
- Wire `apps/api/src/lib/complaint-registry.ts` (viem) into the
  complaint-publish path. Post-MVP, every published complaint anchors
  its `nullifier + slug + photoHashes + categoryCode` via the registry.
- Wire `anchor-receipt.jsx` (E1) onto S01 + S03.
- Deploy Polygon Amoy + Polygon PoS mainnet from the 3/5 Safe (Phase 9
  carry-over §1 + §6).

### 5.2 Workstream B — Complaint lifecycle (status + resolution + endorsement)

- Drizzle schema: `complaint_status_events`, `complaint_endorsements`,
  `complaint_resolutions`. ADR-022 dictates which events anchor on-chain.
- API: `PATCH /complaints/:slug/status`, `POST /complaints/:slug/endorse`,
  `POST /complaints/:slug/resolve`.
- Wire mobile + web composer surfaces from S1 to the new lifecycle.
- Ship `resolution-attestation.jsx` + `critical-escalation.jsx` (already
  in handoff since S1; deferred to S2).
- Right-of-reply portal (L2) ships here too — same lifecycle envelope.

### 5.3 Workstream C — Profiles (accused, leader, moderator)

- Drizzle schema: `accused`, `leaders`, `leader_promises`, `leader_history`.
- API: `GET /accused/:slug`, `GET /leaders/:slug/report-card`,
  `GET /leaders/:slug/history`, `GET /moderators/:handle`.
- Wire F1 (accused), F2 (leader), E5 (moderator profile).
- F3 promise-tracking tied to leader API.

### 5.4 Workstream D — Search + analytics + judicial

- Self-host Meilisearch on Fly.io; ingest `complaints`, `accused`,
  `leaders` indexes via Postgres logical replication.
- Wire web + mobile **Search.*** compound (S05 finally consumed by apps).
- Analytics dashboard (F5): aggregates pre-computed in a nightly cron;
  k-anonymity floor enforced per ADR-029.
- Judicial tracker (F4): `judicial_cases` schema + Court API ingestion
  (eCourts data dump).
- Constituency explorer (F6).
- India-map heatmap surface uses `india-acs.topo.json` (already in the
  S1 handoff stash but excluded from S1 scope).

### 5.5 Workstream E — Governance + public API + i18n + iOS

- Snapshot.org space creation, proposal templates, vote-weight schema
  (ADR-023). DAO surfaces F7 + mobile companions.
- Public API: `apps/api/src/routes/public-api/*.ts` with press-tier auth
  middleware + rate-limit tiers. `api-docs.jsx` (F8) + `api-console.jsx`
  (F9). Press-tier application form lives under `gaps-misc.jsx`.
- i18n: catalogue boot in `packages/shared/src/i18n/`, web + mobile
  consume via `next-intl` / `react-intl`. Translator contributor surface
  (F10).
- iOS native: EAS build + rapidsnark iOS path activation
  (`apps/mobile/ios/*` regenerated). The S1 Detox suite gains iOS
  coverage parallel to Android.
- Election-season + watchdog (F11).
- Help/press + universal error states + maintenance UI (F12).

### 5.6 Workstream F — Admin / Moderation compound alignment (carry-over from S1 W7)

Origin: S1 app-screen-migration W7 could not land cleanly — the
shipped admin surface and the `@factivist/ui-web/moderation` compound
diverged in three places that all need a coordinated fix. The
`Mod.QueueList` / `Mod.DecisionBar` / `Mod.AuditTrail` slots are
currently authored but not consumed by any route.

The three concrete mismatches:

| Surface | Shipped (S1) | Compound (S1) |
|---|---|---|
| Decision vocabulary (`apps/web/src/features/admin/ModerationDecisionForm.tsx` + `packages/shared/src/validators/moderation.ts`) | `'approve' \| 'remove' \| 'escalate'` | `'keep' \| 'hide' \| 'delete' \| 'escalate'` |
| Queue row (`apiClient.listModerationQueue` → `queueItemSchema`) | `id`, `complaintSlug`, `reason`, `targetKind`, `slaDueAt` | `id`, `target.kind` + `target.id`, `reason`, `reportedAt`, `reporterCount`, `excerpt` |
| Audit trail (`apiClient.listAuditLog`) | System-wide `AuditLogEntry` (`ts`, `actor`, `action`, `targetKind`, `targetId`, `payloadHash`) | Per-case `ModAuditEntry` (`itemId`, `decision`, `moderatorHandle`, `note?`, `at`) |

The S1 admin app is fully functional with the custom UI under
`apps/web/src/features/admin/*` — no operator regression. The
alignment work is a design-system hygiene item, not a feature gap.

#### Resolution path (recommended)

**Option 1 — Realign the compound to what shipped.** Lowest friction;
preserves all current UX.

- Expand `ModDecision` to include `'approve' | 'remove'` (or rename
  existing values), expand `ModQueueItem` with `complaintSlug` +
  `slaDueAt`, and replace `Mod.AuditTrail`'s per-case shape with the
  system-wide `AuditLogEntry`.
- Migrate `apps/web/src/features/admin/*` to consume the realigned
  compound in a single follow-up commit.

#### Resolution path (alternatives — not recommended)

- **Option 2 — Realign the admin surface to the compound.** Add the
  per-case audit endpoint + DB query, rewrite the decision-form
  validator to the four-value vocabulary, accept the loss of the SLA
  badge. Higher cost; visible UX regression for operators.
- **Option 3 — Add a second surface.** Keep the existing admin pages
  for operators; build a thinner "review queue" view that consumes
  `Mod.*` for community moderators or external review partners.
  Bigger surface area; only justified once a community-moderator pool
  exists.

#### Acceptance criteria

- Every admin route under `apps/web/src/app/admin/` imports from
  `@factivist/ui-web/moderation` for at least one rendered slot.
- No operator regression — SLA badges, complaint slug deep-links,
  three-option decision form stay shipped.

### 5.7 Hard rules during S2 development

- No ADR-010 anonymity violations — every new surface re-audited by
  `aidefence-guardian` + the existing CI anonymity-grep guard.
- Token discipline unchanged from S1 (semantic only, never primitive).
- Coverage gate 95L / 95F / 95S / 90B unchanged.
- iOS Detox suite must pass before any iOS EAS build is promoted.

---

## Phase 6 — Testing (TDD-First)

- All 20 new compounds + all 20 new screens get Playwright + Detox
  coverage; the same `Argent.discover()→tapDiscovered()` helper from S1
  applies on mobile.
- Recovery-redeem flow has its own end-to-end test that confirms a
  restored handle matches the original nullifier (this is the most
  load-bearing test in S2 — if it fails, ADR-026 is wrong).
- Public API gets a contract-test matrix in
  `packages/contracts/test/public-api/*.ts`.
- a11y baseline extended: AA mandatory on every new surface, AAA opt-in
  on composer + legal + right-of-reply.

Exit gate: per-platform coverage gate green, `pattern_s2_phase_6_done.md`
written, prod-validator emits a GO verdict.

---

## Phase 7 — CI/CD

Carries the existing 13 workflows + adds:

- `contracts.yml` — Hardhat test + slither + mythril on every
  `packages/contracts/**` PR. Was deferred from S1 Phase 6 §6.4 row 8.
- `anchor-staging.yml` — re-anchors a fixed Amoy-testnet complaint and
  asserts the registry round-trips.
- `meilisearch-reindex.yml` — nightly logical-replication sync from
  Postgres.
- `dao-snapshot-sync.yml` — pull Snapshot proposals into the app's
  governance cache.

---

## Phase 8 — Infrastructure Cost & Deployment Settings

- Polygon PoS mainnet Safe + signer set hash. 3/5 weighted toward
  geographically diverse signers per ADR-022.
- iOS App Store provisioning (Apple Dev fee + EAS iOS profile + TestFlight).
- Meilisearch Fly.io machine (256MB suffices through ~50k MAU per Phase 2
  research).
- IPFS pin-cluster — three jurisdiction-diverse pinners, ADR-028 dictates
  replication factor.
- Snapshot.org space configured.
- Sentry projects per app re-baselined for S2 traffic.
- DPDP-aligned data-export staging path: signed-URL → IPFS unpin after
  user fetches.

Exit gate: 4 user-side ops items + the new Polygon mainnet wallet
seeded + first DAO proposal posted as smoke test.

---

## Phase 9 — User Testing & Mainnet Validation

S2 Phase 9 mirrors S1 Phase 9 but with one mandatory new gate:

| Gate | Pass criteria |
|---|---|
| First 100 real on-chain anchors | All 100 confirm within budgeted gas; no failed re-org rollback |
| First DAO proposal closes | At least one Snapshot vote with quorum reached; vote-weight schema works |
| First IT Act §3(2) reply lands inside 14-day window | Counsel signs off the timer logic + the anchored reply |
| First multi-language session ends without bug | One full citizen flow in Hindi, one in Tamil, one in Urdu |
| First press-tier API key issued | Application form → review queue → press key → first successful authenticated query |
| Two-month cost reconciliation | Actual S2 monthly < $800 cap per [[s2-cost-baseline]] |

When all 6 are green, write `pattern_s2_phase_9_done.md` and tag
`v2.0.0`.

---

## 10. What S2 explicitly does NOT do

- **No on-chain Governor (full DAO).** S2 ships Snapshot off-chain
  governance; on-chain Governor is S3.
- **No mass-scale (>1M MAU) load testing.** Phase 1 research must
  confirm Meilisearch + IPFS cluster cost lines do not blow up before
  S3 mass scale.
- **No multi-lingual ZKP prover.** The 24-word seed phrase is English
  word-list only; localised word-lists ship in S3.
- **No fine-tuned moderation models in production yet.** Phase 4 vision
  §"Fine-tune moderation models" — S2 collects the corpus; tuning ships
  in S3.

---

## 11. Open items requiring user decision before S2 Phase 1 kicks off

1. **Audit vendor** — boutique single-reviewer ($15k floor) vs
   contest-style ($25–40k floor). Affects timeline and budget.
2. **DAO quorum + vote-weight schema** — equal-weight (one handle, one
   vote) vs reputation-weighted (older handles or higher endorsement
   counts). Affects ADR-023.
3. **iOS App Store entity** — international jurisdiction per
   product-vison §7 risk-mitigation guidance; the Apple Dev account
   must live somewhere.
4. **Right-of-reply identity proof** — accused/official Aadhaar
   verification path: (a) reuse the citizen ZKP, (b) Indian govt
   employee ID, (c) verified-official email + manual review by Grievance
   Officer. Affects ADR-025.
5. **Recovery-key risk acceptance** — confirm the "lose seed = lose
   handle forever" property is acceptable, OR design an alternative
   (e.g., social-recovery quorum). Affects ADR-026.

---

## References

- [`../season-1/s1-action-plan.md`](../season-1/s1-action-plan.md) — S1
  full plan (read first)
- [`../season-1/phase-9-deferred.md`](../season-1/phase-9-deferred.md) —
  carry-over items
- [`../../product/product-vison.md`](../../product/product-vison.md) —
  canonical phase + feature definitions
- [`../../product/cost-scenarios.md`](../../product/cost-scenarios.md) —
  S1 / S2 / S3+ monthly budget envelopes
- [`../../design/s1/handoff/INDEX.md`](../../design/s1/handoff/INDEX.md)
  — current S1 surface inventory; this plan extends it for S2
- Memory notes: `[[s1-zkp-findings]]`, `[[s2-polygon-gas]]`,
  `[[s1-it-act-posture]]`, `[[s1-cost-drift]]`
