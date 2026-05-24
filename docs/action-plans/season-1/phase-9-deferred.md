# Phase 9 — User Testing & Production-Side Validation

**Status:** PLANNED. Triggers after Phase 8 (Infrastructure Cost & Deployment) lands and the user has had a chance to exercise the full S1 surface end-to-end.

**Why this phase exists:** Phase 5 (Development) deliberately deferred four items that depend on **external upstream** (Polygon mainnet), **ops infrastructure** (Cloudflare KV / Upstash), or **legal counsel** (DPDP §8(7) review). They are tracked here so Phase 6 (Testing) and Phase 7 (CI/CD) can ship without waiting on them.

---

## 1. On-chain `verifyAndRecord` via CitizenVerifier contract

**Origin:** Phase 5 wave-1 reviewer Open Item; tracked in [[s1-phase-5-done]] and [[s1-zkp-findings]] OQ-1.

**What ships in S1 today:** Postgres unique nullifier index in `packages/db/src/schema/citizens.ts` is the authoritative replay check. `POST /identity/verify` runs `verifyProofOnDevice` server-side (re-verification) and writes the nullifier to Postgres. Replay → `409 NULLIFIER_REPLAY`.

**What Phase 9 does:**
- Watch `https://github.com/anoncitizen/contracts` for the canonical `CitizenVerifier.sol` deployment on Polygon Amoy (testnet) and then mainnet.
- Once deployed, wire `apps/api/src/lib/citizen-verifier.ts` (new) to call `verifyAndRecord(proof, publicSignals)` via `viem`. The contract's on-chain `nullifierUsed[]` becomes the source of truth for replay; Postgres becomes a cache.
- Gas budget per [[s2-polygon-gas]] post-Chicago: ~487k gas / $0.0144 per verify.
- Hardhat contract glue per `s1-action-plan.md` Phase 6 §6.4 (`packages/contracts/test/CitizenVerifier.t.ts`) is also part of this phase.

**Blocked on:** AnonCitizen project shipping `CitizenVerifier.sol` to Amoy at minimum. As of 2026-05-24 no upstream deployment exists.

**Owner:** identity team coordinating with AnonCitizen upstream.

---

## 2. Cloudflare KV / Upstash Redis rate limiter for `/identity/prove`

**Origin:** Phase 5 wave-2C handoff; the current in-memory token bucket on the prove route is single-instance only.

**What ships in S1 today:** `apps/api/src/routes/identity.ts` POST `/identity/prove` enforces 10 req/min per source IP via an in-process `Map<string, number[]>`. Tests use `x-test-client-id` for isolation. Works correctly on a single API instance.

**Why it's safe to defer:** S1 launch is **single-instance** (single Bun process on a small Mumbai-region VPS or Cloudflare Worker). The in-memory limiter is the right thing at that scale. The multi-instance failure mode (limiter races across pods) only matters once the API horizontally scales.

**What Phase 9 does — two viable approaches:**

| Approach | Setup | Latency | Cost (S1 scale) | Notes |
|---|---|---|---|---|
| **Cloudflare KV** (Workers KV) | Bind a namespace + key per IP; atomic `put` with TTL = window | ~10-30ms read (eventual consistency between regions) | Free tier covers S1 (100k ops/day) | If the API is already on Cloudflare Workers, zero new infra. Eventual consistency is fine for a 60s rate window. |
| **Upstash Redis** (REST API) | Spin up a Mumbai-region instance; use `INCR` + `EXPIRE` for atomic counter per IP | ~5-15ms from Mumbai region | Free tier covers S1 (10k commands/day) | Strict consistency. Adds one external dep. Better if the API stays on Bun-on-VPS rather than Workers. |

**Recommendation:** wait until the deploy target is locked (Phase 8 picks VPS vs Workers vs Lambda); the choice falls out naturally. Until then, document the abstraction so the swap is a one-file change.

**What Phase 9 actually delivers:**
1. Refactor `apps/api/src/routes/identity.ts` rate limiter behind a `RateLimiter` interface (small change — currently inlined).
2. Implement `cloudflareKvRateLimiter` OR `upstashRedisRateLimiter` per the deploy choice.
3. Wire env vars (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` OR Cloudflare KV namespace binding).
4. Integration test against a real instance (Upstash has a free Mumbai tier).

**Blocked on:** Phase 8 deploy target decision (VPS vs Workers vs Lambda).

**Owner:** ops/devops on deployment cutover.

---

## 3. Legal DPDP §8(7) review on `audit_log.rationale` retention

**Origin:** Phase 5 wave-1 mod-auditor; the `audit_log` table currently retains all rows (including grievance complainant contact details in `rationale`) for 180 days under ADR-0015 (CERT-In intermediary log retention). The question is whether 180 days is compliant with India's Digital Personal Data Protection Act 2023 + DPDP Rules 2025 for the **complainant PII** specifically.

**What the law says:**

| Source | Requirement |
|---|---|
| **DPDP Act 2023 §8(7)** | Data Fiduciary MUST erase personal data once the **purpose is no longer served** — whether by consent withdrawal, purpose fulfilment, or non-engagement past the retention period ([Cyril Amarchand Mangaldas FAQs, 2025](https://www.cyrilshroff.com/wp-content/uploads/2025/12/FAQs-DPDPA.pdf)) |
| **DPDP Rules 2025 Rule 8(3)** | General **1-year minimum** log retention for personal data + processing logs (even post account deletion) ([Seclore DPDP Rules 2025 Guide](https://www.seclore.com/fundamentals/dpdp-rules-2025-compliance-guide/)) |
| **DPDP Rules 2025 Third Schedule** | Sector-specific: 3 years for e-commerce/gaming/social-media platforms with 2 crore (20M) MAU — **NOT applicable to S1** (<5M MAU per [[s1-it-act-posture]]) |
| **DPDP Rules 2025 grievance redressal** | Grievance must be addressed within **90 days** of receipt |
| **CERT-In intermediary rule (existing)** | 180 days for India logs ([[s1-it-act-posture]]) |

**The conflict for Factivist:**
- **General audit_log** retention should be **≥1 year** per DPDP Rules 2025 Rule 8(3) — our current 180 days is **UNDER the floor**. ADR-0015 needs to be raised to 365 days (or whichever is stricter between DPDP and CERT-In).
- **Complainant PII** (name, email) in `audit_log.rationale` is collected for the purpose of "issuing a grievance acknowledgement to the complainant" per ADR-0014. Once the grievance is resolved + the acknowledgement is sent, §8(7) triggers — erasure should happen shortly after, NOT held for 1 year alongside the general audit telemetry.

**What Phase 9 does:**

1. **Confirm with legal counsel** the joint reading of DPDP §8(7) + Rule 8(3) + CERT-In 180-day for a non-SSMI intermediary (Factivist S1 is "intermediary + SMI but NOT SSMI" per [[s1-it-act-posture]]).
2. **Schema split** — pull grievance contact PII out of `audit_log.rationale` into a new `grievance_contacts` table:
   ```sql
   CREATE TABLE grievance_contacts (
     grievance_id TEXT PRIMARY KEY REFERENCES moderation_queue(id),
     complainant_name TEXT,
     complainant_email TEXT,
     created_at TIMESTAMPTZ DEFAULT now(),
     resolved_at TIMESTAMPTZ,
     erase_after TIMESTAMPTZ GENERATED ALWAYS AS (resolved_at + INTERVAL '30 days') STORED
   );
   ```
3. **Replace `audit_log.rationale`** for grievance-related rows with `sha256(complainant_email)` (so the audit row remains the immutable record-of-action but carries no recoverable PII).
4. **Add a second sweep cron** (`scripts/grievance-contacts-sweep.ts`) that deletes `grievance_contacts` rows past `erase_after`. Runs daily alongside the existing audit_log sweep.
5. **Raise general `audit_log` retention** in `packages/db/src/schema/audit_log.ts` from 180 → 365 days (or 540 if CERT-In + DPDP combine via "stricter wins"). Document in an ADR amendment.
6. **Update [[s1-cost-drift]]** — the additional table is sub-MB scale and doesn't move the cost line.

**Blocked on:** Legal counsel confirmation of the joint reading. Counsel should also confirm:
- Whether DPDP "personal data" includes IP addresses in audit_log (it likely does — `actor` for citizen events would need re-examination, though for S1 we don't log citizen-side actions to audit_log).
- Whether the 1-year minimum is interpretable as a maximum-too (i.e., MUST keep 1 year, CAN keep longer up to purpose) or a floor only.
- Whether CERT-In 180-day applies to the SAME data set as the audit_log OR is satisfied by separate request/response logs.

**Owner:** general counsel / DPO retained by Factivist.

**Cited sources:**
- [DPDPA 2023 — Section 8 (Data Fiduciary Obligations)](https://www.dpdpa.com/dpdpa2023/chapter-2/section8.html)
- [DPDP Rules 2025 — Rule 8 (Retention)](https://www.dpdpa.com/dpdparules/rule8.html)
- [DPDP Act 2023 retention & erasure guide (Pricoris)](https://pricoris.com/blog/dpdp-retention-erasure-guide/)
- [Cyril Amarchand Mangaldas FAQs (Dec 2025)](https://www.cyrilshroff.com/wp-content/uploads/2025/12/FAQs-DPDPA.pdf)
- [Seclore DPDP Rules 2025 Compliance Guide](https://www.seclore.com/fundamentals/dpdp-rules-2025-compliance-guide/)
- [EY: Transforming data privacy — DPDP Act 2023 + DPDP Rules 2025](https://www.ey.com/en_in/insights/cybersecurity/transforming-data-privacy-digital-personal-data-protection-rules-2025)
- [DPDP Rules 2025 official notification (PIB, Nov 2025)](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf)

---

## 4. (Not deferred — `rapidsnark binary + zkey local`)

This was previously item #1 in the wave-1/2 deferred list. Per user direction 2026-05-24, the **local setup contract** ships in this same cleanup commit: `apps/api/zkp-artifacts/README.md` + `.gitignore` entry + env-var-driven backend loader (`loadRapidsnarkBackendFromEnv` in `apps/api/src/lib/zkp-prover.ts`) + `createRapidsnarkBackend` shell-out wrapper. Production binary distribution (Docker layer / S3 init container / Lambda layer) is still Phase 8 (Infrastructure & Deployment).

---

## Exit criteria for Phase 9

- [ ] On-chain `verifyAndRecord` integration shipped + Hardhat contract tests passing against Polygon Amoy
- [ ] Rate limiter swapped to Cloudflare KV or Upstash per deploy target; integration-tested live
- [ ] Legal counsel sign-off on the new `grievance_contacts` table + revised retention (1 year general / 30 days post-resolve grievance PII)
- [ ] Migration applied + production data verified
- [ ] [[s1-cost-drift]] reconciled with any new SaaS spend (Upstash if chosen)
- [ ] User runs full end-to-end exercise of the S1 surface (web + iOS + Android) without regressions
