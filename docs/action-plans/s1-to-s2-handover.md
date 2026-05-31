# S1 → S2 Handover

> **Status:** STUB. Sections below are placeholders waiting on a real S2
> graduation trigger.
>
> This is **not** a postmortem and **not** a PRD — it is the operational
> baton that S2 needs to start without re-discovering S1 state.
>
> **Trigger condition** (per `season-1/s1-action-plan.md` §"S1 → S2
> Graduation Triggers"): any of (a) ≥ 5,000 verified citizens, (b) first
> takedown / seizure scare, (c) > 5 % of complaints flagged for
> moderation. None of these have fired as of file creation
> (2026-05-26).
>
> **Owner:** `planner` agent (lead), countersigned by `architect` and
> `sec-architect`. Run `/handover s1-to-s2` (or the manual generation
> command in `season-1/s1-action-plan.md` §"Handover file (S1 → S2)")
> when a trigger fires; the swarm fills in every `TBD` below.

---

## 1. S1 state snapshot — TBD

> Owner agent: `cost-analyst`. Source of truth: weekly scorecard
> ([`Ops-S1-Scorecard`](https://github.com/facktivist/factivist/wiki/Ops-S1-Scorecard)).

Fill in at handover time:

- Date the trigger fired:
- MAU on the trigger date:
- Verified citizens (count + delta over last 7 days):
- Total complaints (published + pending):
- Manual-moderation queue depth (median + p95 SLA hours):
- Active operators (count + tenure):

---

## 2. Which graduation trigger fired and the evidence — TBD

> Owner agent: `planner`. Source of truth: metrics + incident log.

- Trigger fired: ⬜ ≥ 5k verified citizens ⬜ first takedown / seizure
  scare ⬜ > 5 % complaints flagged
- Evidence (issue / incident / metric snapshot link):
- Time-to-decision:
- Stakeholders notified:

---

## 3. Live infra inventory — TBD

> Owner agent: `devops`. Source of truth: deployment workflows in
> `.github/workflows/` + the runbooks under `docs/operations/`.

| Service | URL | Region | Instance size | Secret location |
|---|---|---|---|---|
| Vercel — apps/web |  | bom1 |  | GitHub `VERCEL_*` |
| Fly.io — apps/api |  | bom (primary), sin (failover) | shared-cpu-1x / 256 MB | GitHub `FLY_*` |
| Supabase — Postgres + Storage + Auth |  | ap-south-1 |  | GitHub `DATABASE_URL`, `SUPABASE_*` |
| Cloudflare — DNS + proxy + Workers cron |  | global |  | GitHub `CF_*` |
| EAS — Android + iOS |  | n/a | `eas.json#preview/production` | GitHub `EAS_*` |
| Sentry — web + api + mobile |  | n/a |  | GitHub `*_SENTRY_DSN` |
| Polygon mainnet — `CitizenVerifier.sol` | (Phase 9 §1, blocked on AnonCitizen upstream) | n/a | n/a | 3/5 Safe multisig |

---

## 4. Open risks carried into S2 — TBD

> Owner agent: `sec-architect`. Source of truth:
> [`docs/architecture/threat-model.md`](../architecture/threat-model.md)
> + audit findings.

Carry-overs the S2 swarm must read first:

- [ ] `pattern_s1_phase_4_done.md` — 21 ADRs in `docs/adr/0001..0021`
- [ ] `pattern_s1_phase_5_done.md` — 4 wave-4 deferred items
- [ ] `pattern_s1_phase_8_done.md` — 13-item user-side ops do-list
- [ ] `reference_s1_zkp_findings.md` — 7 OQs (top: no upstream Polygon
      mainnet deploy)
- [ ] `reference_s1_cost_drift.md` — tolerance bands + escalation
- [ ] `reference_s1_it_act_posture.md` — intermediary + SMI gates
- [ ] `reference_s1_constituency_source.md` — 15 taxonomy ambiguities

Plus any new STRIDE rows that landed between S1 launch and the
trigger.

---

## 5. Frozen contracts — TBD

> Owner agent: `architect`. Source of truth: on-chain explorers + ADRs.

| Asset | Address / version / hash |
|---|---|
| `CitizenVerifier.sol` (Polygon mainnet) |  |
| `CitizenVerifier.sol` ABI sha256 |  |
| anon-aadhaar verification key sha256 |  |
| AnonCitizen v3 nullifier formula |  |
| `factivist-session` HMAC algorithm | `HS256 (HMAC-SHA256)` |
| Supabase JWT issuer + audience |  |

---

## 6. Data shape inventory — TBD

> Owner agent: `db-architect`. Source of truth: `bun run db:generate`
> diff + `pg_stats`.

- Drizzle schema version:
- Migrations applied to prod (0001..00NN):
- Row counts per table (citizens, complaints, comments, audit_log,
  grievance_contacts, …):
- FTS index sizes:
- Storage bucket sizes (complaint-photos, zkp-artifacts):

---

## 7. Test + coverage baseline — TBD

> Owner agent: `qa-lead`. Source of truth: `bun run test:coverage`.

| Package | Lines | Funcs | Stmts | Branches | Total tests |
|---|---|---|---|---|---|
| apps/api |  |  |  |  |  |
| apps/web |  |  |  |  |  |
| apps/mobile |  |  |  |  |  |
| packages/shared |  |  |  |  |  |
| packages/db |  |  |  |  |  |
| packages/ui/* |  |  |  |  |  |
| scripts |  |  |  |  |  |

E2E counts at handover:
- Web (Playwright):
- iOS (Detox):
- Android (Detox):

---

## 8. Cost baseline — TBD

> Owner agent: `cost-analyst`. Source of truth: billing exports + the
> [`Ops-S1-Scorecard`](https://github.com/facktivist/factivist/wiki/Ops-S1-Scorecard).

| Month | Vercel | Fly.io | Supabase | Cloudflare | EAS | Sentry | Polygon gas | LLM | TOTAL |
|---|---|---|---|---|---|---|---|---|---|
| M-3 |  |  |  |  |  |  |  |  |  |
| M-2 |  |  |  |  |  |  |  |  |  |
| M-1 |  |  |  |  |  |  |  |  |  |

Tolerance band at S1 close: Green ≤ $105 / Amber $105–$115 / Red >
$115. See `reference_s1_cost_drift.md`.

---

## 9. S2 stack delta read-out — TBD

> Owner agent: `architect`. Source of truth:
> [`cost-scenarios.md`](../product/cost-scenarios.md#s2--tamper-evident-pilot)
> + [`season-2/s2-action-plan.md`](./season-2/s2-action-plan.md).

What S2 adds (each row → owner + dependency):

- **Meilisearch** full-text search (replaces Postgres `ilike`)
- **Polygon mainnet anchoring** via `ComplaintRegistry.sol` (depends
  on Phase 9 §1)
- **iOS native** via EAS (Android-only today)
- **next-intl + react-intl** i18n shell (Hindi + Tamil + Urdu v1)
- **Snapshot.org** off-chain DAO governance
- **Public API** with press-tier auth + rate-limit tiers
- **IPFS pin cluster** (web3.storage + Filebase + self-host)
- **Upstash Redis** rate limiter (already shipped, activation
  pending — Phase 9 §2)
- **Sentry** wired (DSNs pending — Phase 9 Group B7)

---

## 10. Cutover plan (additive only — nothing removed) — TBD

> Owner agent: `planner`. Source of truth: this doc §0–§8 +
> `season-2/s2-action-plan.md`.

Phase-by-phase cutover order (only fill in once §3 and §5 are
written):

1. S2 Phase 1 (research) opens — no production changes.
2. S2 Phase 5 Workstream A — Polygon anchoring goes dual-write
   (Postgres + on-chain). Postgres stays authoritative.
3. S2 Phase 5 Workstream D — Meilisearch ingests Postgres via
   logical replication; reads stay on `ilike` until parity proven.
4. S2 Phase 8 — flip the search-read backend; Meilisearch becomes
   primary, Postgres becomes the fallback for 30 days.
5. S2 Phase 9 — verify first 100 anchors confirm; verify first DAO
   proposal closes; verify first IT Act §3(2) reply lands inside 14
   days.

---

## 11. Rollback plan (how to keep running on S1 if S2 stalls) — TBD

> Owner agent: `devops`. Source of truth: DR drill log
> (`docs/operations/dr-drill-s1.md`).

For each S2-added service, the rollback path:

- Meilisearch outage → revert search backend to Postgres `ilike`.
  Code path remains in `apiClient.listComplaints({ q })`.
- Polygon anchoring outage → fall back to Postgres-only replay check
  (S1 baseline).
- IPFS pin-cluster outage → Supabase Storage remains the canonical
  photo store.
- Upstash Redis outage → `selectProveRateLimiter()` falls back to
  the in-memory token bucket.

---

## 12. Open ADRs that S2 must resolve — TBD

> Owner agent: `adr-writer`. Source of truth: `docs/adr/` + the S2
> action plan §"Phase 4 — Project Architecture".

S2 must ratify ADRs 0022–0030 before Phase 5 starts. The shape lives
in the S2 plan; this section captures any divergence from that shape
discovered at handover time.

Pre-empted concerns:

- ADR-026 (recovery-key custody) — confirm the "lose seed = lose
  handle forever" property is acceptable, OR design social-recovery
  quorum.
- ADR-029 (analytics privacy budget) — k-anonymity floor for every
  aggregate that ships publicly.

---

## 13. Memory keys to carry forward — TBD

> Owner agent: `planner`. Source of truth:
> `~/.claude/projects/-Users-allan-Projects-factivist/memory/MEMORY.md`.

The S2 swarm should `memory search --namespace patterns --query "s1-"`
at boot. The keys below are the ones S2 cannot operate without:

- `[[s1-phase-{1..8}-done]]` — phase exit memory
- `[[s1-zkp-findings]]` — anon-aadhaar deployment + nullifier formula
- `[[s2-polygon-gas]]` — post-Chicago hardfork gas baseline
- `[[s1-it-act-posture]]` — intermediary + SMI legal posture
- `[[s1-constituency-source]]` — 4-table reference dataset + 15
  ambiguities
- `[[s1-cost-drift]]` — tolerance bands + escalation
- `[[s1-design-wave-done]]` — 9 surfaces × compound implementations
- `[[s1-phase-1-backlog]]` — original 106-issue epic→story map

---

## 14. Sign-offs

- [ ] `planner` — S1 state snapshot (§1), graduation trigger (§2),
      cutover plan (§10), memory keys (§13) signed off
- [ ] `architect` — frozen contracts (§5), S2 stack delta (§9), open
      ADRs (§12) signed off
- [ ] `sec-architect` — open risks (§4), threat-model alignment
      signed off
- [ ] User — final go for S2 Phase 1 kickoff

When all four checkboxes are ticked, run:

```bash
npx ruflo@latest memory store --namespace patterns \
  --key "s1-to-s2-handover-signed" \
  --value "Signed YYYY-MM-DD. Trigger: <which one>. Owner: planner. Next: s2-action-plan.md phase 1."
npx ruflo@latest hooks post-task --task-id "s1-to-s2-handover" --success true --store-results true
```

---

## References

- [`season-1/s1-action-plan.md`](./season-1/s1-action-plan.md) §"S1 →
  S2 Graduation Triggers" — the source of truth for this file's
  structure
- [`season-2/s2-action-plan.md`](./season-2/s2-action-plan.md) — what
  the swarm starts working on after this handover is signed
- [`season-1/phase-9-checklist.md`](./season-1/phase-9-checklist.md) —
  Phase 9 ops items that must close before S2 graduation can fire
- [`season-1/phase-9-deferred.md`](./season-1/phase-9-deferred.md) —
  the four S1-Phase-5 deferrals
