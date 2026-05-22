# AnonCitizen Security Audit — Scope, Options & Cost Plan

**Repository under review:** [`raveracker/anoncitizen`](https://github.com/raveracker/anoncitizen)
**Target chain:** Polygon PoS (EVM-equivalent)
**Document version:** 1.0
**Date:** 2026-05-23
**Decision owner:** Allan

---

## 1. Executive Summary

| Item | Value |
|---|---|
| **Total reviewable surface** | ~133 lines Solidity (custom) + ~1,200 lines Circom (custom) |
| **Auto-generated / pre-audited code** | ~385 lines Solidity (Groth16Verifier) + ~485 lines Circom (zk-email) |
| **Recommended audit path** | Pre-audit hardening (free) + indie ZK solo review |
| **Recommended budget** | **$3k–6k** (full) or **$0–500** (diff-only, if treating as anon-aadhaar fork) |
| **Boutique-shop equivalent quote** | $40k–80k — **avoid; not justified by scope** |
| **Spearbit / Cantina quote** | $65k–96k+ — **avoid; massively overscoped** |
| **Recommended timeline** | 1–2 weeks elapsed, 3–5 auditor-days of work |

**Headline finding:** AnonCitizen is structurally a fork/re-implementation of [anon-aadhaar](https://github.com/anon-aadhaar/anon-aadhaar) (already audited by zkSecurity, public report) reusing `@zk-email/circuits` (audited by zkSecurity + PSE). The marginal audit surface is small. Anyone quoting boutique ZK pricing is charging you for work already done upstream.

---

## 2. Repository Structure Analysis

### 2.1 Code Inventory

```
packages/contracts/contracts/
├── AnonCitizen.sol         133 lines   custom        ← AUDIT
├── IAnonCitizen.sol         38 lines   interface     skip
└── Groth16Verifier.sol     385 lines   auto-gen      skip (snarkjs deterministic)

packages/circuits/
├── aadhaar-verifier.circom 244 lines   custom        ← AUDIT (composition only)
└── lib/
    ├── field_extractor.circom        351 lines  custom   ← AUDIT
    ├── nullifier.circom              141 lines  custom   ← AUDIT
    ├── rsa_verifier.circom           493 lines  upstream skip (zk-email fork)
    ├── sha256_hasher.circom          282 lines  custom-wrap ← AUDIT (light)
    └── timestamp_converter.circom    174 lines  custom   ← AUDIT
```

**Total reviewable nSLOC:** ~133 Solidity + ~1,192 Circom = **~1,325 nSLOC**

### 2.2 Contract Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AnonCitizen.sol                      │
│  (133 lines — wrapper with nullifier + key registry)    │
│                                                         │
│  state:                                                 │
│    immutable verifier   → Groth16Verifier               │
│    immutable owner      → deploy msg.sender             │
│    nullifierUsed[]      → replay prevention             │
│    trustedPubKeyHash[]  → UIDAI key allowlist           │
│                                                         │
│  external:                                              │
│    verifyAndRecord()  ← main path                       │
│    verifyOnly()       ← view-only dry-run               │
│    addTrustedPubKeyHash()   onlyOwner                   │
│    removeTrustedPubKeyHash() onlyOwner                  │
└────────────────┬────────────────────────────────────────┘
                 │ calls
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Groth16Verifier.sol                        │
│  (385 lines — snarkjs auto-generated, IMMUTABLE)        │
│  verifyProof(_pA, _pB, _pC, _pubSignals) → bool         │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Public Signal Layout (`_pubSignals[32]`)

| Index | Field | Notes |
|---|---|---|
| 0 | `nullifier` | `Poseidon(nullifierSeed, photoHash)` |
| 1 | `timestamp` | UNIX UTC from Aadhaar doc |
| 2 | `pubKeyHash` | Hash of UIDAI RSA public key used |
| 3 | `signalHash` | Anti-frontrun bound signal |
| 4 | `nullifierSeed` | App-provided scope seed |
| 5 | `ageAbove18` | 1 / 0 / 0=hidden |
| 6 | `gender` | 1=M, 2=F, 3=T, 0=hidden |
| 7 | `state` | Encoded, 0=hidden |
| 8 | `pincode` | 6-digit PIN, 0=hidden |
| 9–31 | unused / padding | snarkjs verifier signature requires fixed array |

---

## 3. What Needs Audit — Complete Breakdown

| Component | LoC | Audit needed? | Reason | Effort (days) |
|---|---|---|---|---|
| `Groth16Verifier.sol` | 385 | **No** | Deterministic snarkjs output. Pairing math has been audited 100+ times across the ecosystem. Anyone trying to bill for this is upselling. | 0 |
| `@zk-email/circuits` (RSA, SHA256 base) | 485 | **No** | Already audited by zkSecurity and PSE. Used in production by 20+ projects (zkemail.io, Login with Email, Headers Only, etc.). | 0 |
| `IAnonCitizen.sol` (interface) | 38 | **No** | Interface only, no executable logic. | 0 |
| `AnonCitizen.sol` (wrapper) | 133 | **Yes** | Custom storage layout, owner-controlled key registry, nullifier mapping, external call ordering. Highest-leverage attack surface. | 1.0 |
| `aadhaar-verifier.circom` (composition) | 244 | **Yes** | Signal ordering must match Solidity wrapper exactly. Public input mapping. Constraint binding between sub-circuits. Off-by-one in signal index = silent verification of attacker-controlled data. | 0.5 |
| `nullifier.circom` | 141 | **Yes** | Domain separation between apps. Photo hash truncation. Poseidon parameter choice. Replay across nullifier seeds. | 0.5 |
| `field_extractor.circom` | 351 | **Yes** | **Highest-risk file.** Byte selector under-constrainment is the #1 ZK bug class. State/PIN/gender extraction from Aadhaar XML byte stream. | 1.0 |
| `timestamp_converter.circom` | 174 | **Yes** | IST→UTC conversion. Edge cases: year boundaries, Feb 29 leap years, range validation. India has no DST so that's simpler. | 0.25 |
| `sha256_hasher.circom` | 282 | **Yes (light)** | Wrapper around zk-email primitives. Verify input length encoding + padding is correct; the SHA core itself is upstream. | 0.25 |
| **Total review effort** |  |  |  | **3.5 days** |

### 3.1 Specific Findings to Flag for the Auditor

These are pre-identified concerns from a desk review — give this list to whoever you hire:

**Solidity (`AnonCitizen.sol`):**
1. **Line ~111**: nullifier is recorded *after* the verifier call. Verifier is `immutable` view-only, so no reentrancy — but worth explicit confirmation in the report.
2. **Line ~60–63**: owner is `immutable` (set at deploy). There is **no `transferOwnership`**. If the deployer key is lost, key rotation becomes impossible. Decide: is this intentional (security feature) or an oversight?
3. **`removeTrustedPubKeyHash`**: when a UIDAI key is rotated/revoked, in-flight proofs against the old key will fail verification with `UntrustedPublicKey`. Is there a grace period? Document the operational runbook.
4. **`_pubSignals[32]`**: array is sized 32 but only 9 signals are documented. Confirm snarkjs verifier output matches this exact width; mismatch causes silent revert.
5. **Gas DoS via nullifier mapping**: `nullifierUsed` is unbounded. Standard pattern — no fix needed — but call it out.
6. **No pause / emergency stop**: by design? If a circuit vulnerability is discovered post-deployment, there is no way to disable verification.

**Circom (composition + libs):**
1. **Under-constrained byte selectors** in `field_extractor.circom`: the #1 ZK bug class. Each byte position needs an explicit `==` constraint, not just a hint.
2. **Photo hash truncation**: `nullifier.circom` hashes photo bytes. Truncation method must be deterministic and collision-resistant. Confirm Poseidon input width and field reduction.
3. **Nullifier seed domain separation**: confirm that `Poseidon(seed_A, photo)` and `Poseidon(seed_B, photo)` cannot collide. Standard Poseidon use should be safe, but explicit.
4. **IST timezone offset hard-coded**: 5:30 offset. If Aadhaar ever changes timestamp format, circuit breaks silently. Document.
5. **RSA signature**: zk-email's RSA is audited, but confirm the `n=64, k=32` parameter choice matches UIDAI's 2048-bit RSA (not 4096).
6. **Trusted setup ceremony**: if Groth16, the `.zkey` was generated from a phase 2 ceremony. **Who ran it? How many contributors? Where is the attestation?** This is often missed and is critical for Groth16.

### 3.2 Out of Scope (Explicit)

- Solidity pairing precompile (chain-level, audited at EVM spec)
- Poseidon hash function (BN254 over scalar field — standard parameterisation)
- SHA-256 core (zk-email upstream)
- Browser SDK (`packages/core`, `packages/react`) — these are off-chain; if a bug exists there, an attacker can't generate a valid proof anyway, but might mishandle a user's QR data. Consider a separate, cheaper code review.

---

## 4. Audit Options — Detailed Cost Breakdown

Options ranked from cheapest to most expensive.

### Option A — Differential audit vs. anon-aadhaar

**Cost:** $0–500
**Timeline:** 4 hours – 1 day
**Best for:** if you treat AnonCitizen as a near-fork of anon-aadhaar

**What you get:** Half-day engagement with someone who has audited or contributed to anon-aadhaar. Output: a delta-only report listing every divergence from the reference and a risk assessment for each.

**Where to find:** Solodit, Cantina solo profiles, anon-aadhaar GitHub contributors, PSE Discord.

**Rate math:** 4 hours × $100–125/hr = $400–500.

**Pros:** Cheapest path. Auditor already knows 80% of the surface.
**Cons:** Doesn't catch novel bugs in *new* sub-circuits if they diverge meaningfully. Not a "security audit" for marketing purposes.

---

### Option B — Free public-goods review (PSE / Devfolio)

**Cost:** $0
**Timeline:** 6–10 weeks elapsed
**Best for:** if you can wait and frame the project as public infrastructure

[Privacy & Scaling Explorations (PSE)](https://pse.dev/) runs free reviews for ZK public-goods projects, especially in the Aadhaar / identity / proof-of-personhood space. They funded the original anon-aadhaar work.

**Application:** PSE grants form → mention "Aadhaar ZK fork, public-goods, requesting security review only, no funding ask."

Devfolio / ETHIndia also offer free reviews through their partner network for projects pitched in the India identity ecosystem.

**Pros:** Free, high-credibility reviewers, often publishable report.
**Cons:** Slow (6–10 weeks), competitive intake, no guaranteed acceptance.

---

### Option C — Bug bounty (no upfront)

**Cost:** $0 upfront; $5k–15k bounty pool, pay-on-finding
**Timeline:** Continuous (open-ended)
**Best for:** post-deployment, ongoing assurance

| Platform | Platform fee | Notes |
|---|---|---|
| [Hats.finance](https://hats.finance/) | ~0% retainer | Cheapest. DAO-friendly. Pays in protocol tokens or stable. |
| [Immunefi](https://immunefi.com/) | 10% of paid bounties | Largest researcher network. Premium brand. |
| [Cantina Free Tier](https://cantina.xyz/) | Free for public goods | Smaller researcher pool than Immunefi but free. |

**Cost shape:**
- $5k pool → attracts hobbyist researchers, finds 60–70% of critical bugs over 6 months
- $15k pool → attracts mid-tier, finds 80–90%
- $50k pool → attracts top researchers, finds ~95%

**Pros:** Pay only if real bug found. Continuous coverage. Real-world attacker incentive alignment.
**Cons:** **Not a pre-launch audit.** Don't use as your only safety net before mainnet. Use *alongside* one of A, D, E, or F.

---

### Option D — Indie ZK auditor (recommended for this project)

**Cost:** $3k–6k
**Timeline:** 1 week elapsed, 2–3 auditor-days
**Best for:** AnonCitizen specifically — best price/quality ratio

Hire **one** indie auditor with anon-aadhaar / Semaphore / WorldID / zk-email experience. Outreach via Twitter, Farcaster DMs, or Solodit profiles.

**Rate math:**
- Mid-tier indie ZK auditor: $1.5k–2.5k/day
- 2–3 days for a wrapper-focused review
- Total: $3k–6k

**Names / sources to look at:**
- anon-aadhaar contributor list on GitHub
- Semaphore protocol contributors
- 0xPARC alumni Discord
- zkSecurity individual researchers (look for freelance availability)
- PSE alumni (people who left PSE for independent work)
- Solodit top-100 with ZK tag

**What you get:**
- Written report (Markdown or PDF), severity-classified findings
- 1–2 remediation review passes included
- Public credit (optional)

**Pros:** Best price for what you actually need. Personal accountability. Familiar with the exact tech stack.
**Cons:** Single reviewer = single perspective. Mitigate by pairing with Option C (bug bounty) post-launch.

---

### Option E — Code4rena Solo Audit

**Cost:** $9k–13k all-in
**Timeline:** 1–2 weeks
**Best for:** if you want a recognized platform name on the report

Book directly with a warden via their [Code4rena profile](https://code4rena.com/leaderboard). Filter by ZK contest participation.

**Cost math:**
- Warden quote: $7k–11k (2–3 days at warden rate)
- Code4rena admin fee: 20%
- All-in: $9k–13k

**What you get:**
- Code4rena-branded report
- Findings published on Code4rena reports page (good for marketing)
- Platform-managed escrow + remediation cycle

**Pros:** Brand recognition. Public report adds trust signal. Platform handles logistics.
**Cons:** 20% premium for the brand. Same depth as Option D for 2× the cost.

---

### Option F — Sherlock Solo

**Cost:** $10k–18k
**Timeline:** 1–2 weeks
**Best for:** projects targeting DeFi integrations (Sherlock's lender insurance product makes this signal valuable)

Sherlock prices per nSLOC. For ~1,300 reviewable nSLOC at their lower band: **~$10k–13k**. ZK premium (80–120% above EVM baseline per their published guide) may push to **~$15k–18k**.

**Pros:** Insurance-aligned auditor (incentive to find real bugs because Sherlock's pool pays if exploited). Strong DeFi credibility.
**Cons:** Designed for protocols seeking lender coverage; overkill for a verifier wrapper.

---

### Option G — Boutique ZK shop (zkSecurity, Veridise, Least Authority, ABDK)

**Cost:** $25k–60k (light scope) or $40k–80k (full scope incl. circuit soundness)
**Timeline:** 3–6 weeks
**Best for:** if you have $50k to spend and need the strongest possible brand on the report

**Cost math:**
- Light scope (wrapper + circuit sanity, no constraint soundness review): $25k–40k
- Full scope (constraint soundness, trusted setup review, formal-ish methods): $40k–80k
- Researcher rate: $2k–3.5k/day, 2 researchers, 2–3 weeks

**Pros:** Strongest brand. Most thorough. Multiple researcher perspectives.
**Cons:** **6–15× overpriced for AnonCitizen's actual scope.** Most of their value is in catching novel cryptographic bugs — yours uses well-trodden patterns.

---

### Option H — Spearbit / Cantina Lead Engagement

**Cost:** $65k–96k+ (2 weeks, 2 lead researchers minimum)
**Timeline:** 2–4 weeks elapsed
**Best for:** **not this project**

Spearbit requires 2 Lead Security Researchers minimum at $32.5k–48k per week per team of 3–5 researchers.

**Verdict:** Avoid. Not appropriate for this scope. Listed here only so you can confidently say no when an investor or partner asks "did you get a Spearbit audit?"

---

## 5. Recommended Two-Stage Path

Total budget: **$3k–6k**. Total elapsed time: **1.5–2 weeks**.

### Stage 1 — Pre-Audit Hardening (free, 2 days of your time)

Run before paying any auditor. This finds 60–80% of common bugs for free, so the paid auditor focuses on novel issues.

#### Solidity hardening checklist

- [ ] **Slither** — `slither packages/contracts/` → fix all High/Medium
- [ ] **Aderyn** — `aderyn packages/contracts/` (Cyfrin's open-source static analyzer)
- [ ] **Solhint** — `solhint 'packages/contracts/contracts/**/*.sol'`
- [ ] **Mythril** — `myth analyze packages/contracts/contracts/AnonCitizen.sol`
- [ ] **Foundry invariant tests:**
  - Nullifier uniqueness across N proofs
  - Verifier address never changes (immutable invariant)
  - Owner privileges (only owner can add/remove pubkey hash)
  - Replay attempt always reverts with `NullifierAlreadyUsed`
- [ ] **Gas profiling** — confirm documented ~260k gas claim holds under Polygon PoS pricing

#### Circom hardening checklist

- [ ] **circomspect** — `circomspect packages/circuits/` (Trail of Bits' static analyzer for Circom)
- [ ] **Picus / Ecne** — under-constrained signal detection (Veridise tools, OSS)
- [ ] **Constraint count audit** — confirm the constraint count matches expectations; large unexplained jumps suggest under-constraint
- [ ] **Manual review of every `<==` vs `===`** — `<==` assigns and constrains; `===` only constrains. Mix-ups are the most common ZK bug source.
- [ ] **Trusted setup verification** — if Groth16: verify the `.zkey` was generated from a multi-party ceremony, document contributors, publish attestation

#### Differential review

- [ ] Line-by-line diff of `AnonCitizen.sol` against anon-aadhaar's verifier wrapper
- [ ] Diff every custom Circom file against the closest anon-aadhaar equivalent
- [ ] Document every divergence in a `DIFFS.md` file → give to the paid auditor

### Stage 2 — Paid Solo Review ($3k–6k, 3 days)

- Hire one indie ZK auditor (Option D above)
- Hand them: source repo, `DIFFS.md`, pre-audit findings, this document
- Scope: 3 days focused on:
  - Public signal index mapping (Solidity ↔ circuit ↔ docs all agree)
  - Nullifier domain separation (cross-app replay impossibility)
  - Trusted pubkey registry edge cases (rotation, race conditions)
  - `field_extractor.circom` constraint completeness
  - Trusted setup attestation review
- Deliverable: severity-classified report + 1 remediation pass

### Stage 3 (post-launch) — Open Bug Bounty

- Open a $5k–10k pool on Hats.finance
- Scope: deployed mainnet contract only
- Keep open continuously

---

## 6. Cost Comparison Matrix

| Option | Cost (USD) | Timeline | Depth | Brand Value | Recommended? |
|---|---|---|---|---|---|
| A. Differential review | $0–500 | 1 day | Low | None | ✅ Cheapest sanity check |
| B. PSE free review | $0 | 6–10 wk | High | High | ✅ If timeline allows |
| C. Bug bounty (Hats) | $0 upfront + $5–15k pool | Continuous | Variable | Medium | ✅ Post-launch, always |
| **D. Indie ZK auditor** | **$3k–6k** | **1 wk** | **High** | **Low-Med** | ✅ **PRIMARY RECOMMENDATION** |
| E. Code4rena Solo | $9k–13k | 1–2 wk | High | High | ⚠️ If brand matters |
| F. Sherlock Solo | $10k–18k | 1–2 wk | High | High (DeFi) | ⚠️ Overkill for verifier |
| G. Boutique ZK shop | $25k–80k | 3–6 wk | Highest | Highest | ❌ Overpriced for scope |
| H. Spearbit / Cantina | $65k–96k+ | 2–4 wk | Highest | Highest | ❌ Massively overscoped |

---

## 7. Decision Framework

Pick your path based on which of these is true:

| Your situation | Recommended path | Total cost |
|---|---|---|
| Hackathon / MVP / no users yet | A + Stage 1 only | $0–500 |
| Public-goods, can wait 2 months | B (PSE) | $0 |
| Pre-launch, real users coming, normal budget | **Stage 1 + D + C** | **$3k–6k + $5k pool** |
| Pre-launch, need brand for fundraising/partnership | Stage 1 + E + C | $9k–13k + $5k pool |
| Handling >$1M TVL or sensitive PII | Stage 1 + G + C | $25k–40k + $10k pool |
| Bank/government partnership requirement | Stage 1 + H + C | $65k–96k + $10k pool |

**For Factivist-adjacent use case (verifier wrapper, pre-launch, public-goods-leaning):** Stage 1 + Option D + Option C. **Total: ~$3k–6k upfront + $5k continuous bounty pool.**

---

## 8. Procurement Checklist

When engaging any paid auditor:

- [ ] Get a written scope document (what's in, what's out)
- [ ] Get sample report from prior engagement (anonymised is fine)
- [ ] Agree severity definitions upfront (Critical / High / Medium / Low / Informational)
- [ ] Agree remediation cycle: how many passes included, hourly rate for additional
- [ ] Agree NDA terms (auditor names + report publication rights)
- [ ] Agree disclosure timeline if Critical found mid-audit
- [ ] Fixed-price contract, not hourly (avoids scope creep)
- [ ] Payment: 50% on start, 50% on report delivery (never 100% upfront)
- [ ] Get the auditor to sign off on the trusted setup ceremony attestation (if Groth16)

---

## 9. Deploy-First Path (deploy now, audit later)

Reasonable for AnonCitizen because the contract holds no funds and a bug is recoverable via v2 deployment. Worst-case outcome is forged identity proofs (e.g., fake age claims), not stolen money. Use this path only with explicit guardrails below.

### 9.1 Why this is defensible for AnonCitizen (and not for most contracts)

| Risk dimension | AnonCitizen | Typical DeFi |
|---|---|---|
| Holds user funds? | No | Yes |
| Upgradable? | No (immutable) — bug forces v2 deploy | Often yes |
| Bug → fund theft? | No | Yes |
| Bug → identity forgery? | Yes | No |
| Recovery: deploy v2 + migrate dapps | Easy | Hard (TVL migration) |
| Worst-case blast radius | Trust + reputational | Financial + reputational |

### 9.2 Mandatory pre-deploy steps (do NOT skip)

These are free and catch 60–80% of common bugs. Skipping these is the actual risk.

**Solidity hardening:**
```bash
slither packages/contracts/
aderyn packages/contracts/
solhint 'packages/contracts/contracts/**/*.sol'
myth analyze packages/contracts/contracts/AnonCitizen.sol
forge test --match-contract AnonCitizen -vvv
# Add invariant tests: nullifier uniqueness, owner privileges, replay always reverts
```

**Circom hardening:**
```bash
circomspect packages/circuits/
# Picus / Ecne for under-constrained signal detection
# Manual review of every `<==` vs `===` in custom circuits
```

**Trusted setup verification:**
- If Groth16: confirm `.zkey` provenance, document phase-2 ceremony contributors, publish attestation file
- Without this, the entire system is trust-broken regardless of any audit

### 9.3 Soft-launch protocol

- Deploy to Polygon PoS Mainnet (chain 137), tagged **`v0.1.0-pre-audit`** (not `v1.0.0`)
- README, frontend, and docs display: **"⚠️ UNAUDITED — DO NOT USE FOR FINANCIAL OR LEGAL DECISIONS"**
- Do NOT list on contract aggregators yet (DeFiLlama, L2Beat, Polygonscan verified-and-secure badge)
- Do NOT publish "secure" marketing claims
- Internal release notes must explicitly acknowledge unaudited status

### 9.4 Open bug bounty from day 1

| Platform | Pool | Cost upfront | Best for |
|---|---|---|---|
| **Hats.finance** | **$2k–5k** | $0 retainer | **Recommended** — no platform fee, DAO-friendly |
| Immunefi | $5k–15k | 10% of paid bounties | Larger researcher network if budget allows |

Bounty scope: deployed mainnet contract address only. Severity payouts: Critical = full pool, High = 30%, Medium = 10%.

### 9.5 Consuming-dapp exposure caps

Even if AnonCitizen has a bug, your integrating dapps can limit blast radius:

- **Rate limit per nullifier seed** — cap proofs/hour per seed
- **Time-lock high-value actions** — give yourself a window to revoke trust in v1 if a bug surfaces
- **Don't gate large amounts on identity alone** — combine with additional checks for the most sensitive 1% of operations
- **Maintain an off-chain allowlist** for highest-value flows during the unaudited window

### 9.6 Audit trigger (pick ONE concrete trigger now)

"Audit later" without a trigger means "never". Commit to one of these now and write it into the project tracker:

| Trigger | When it kicks in |
|---|---|
| **> 1,000 unique nullifiers used** | Real user base — reputation at risk |
| **First partnership / integration request** | Their compliance team will require the report |
| **Before any "gates > $X" use case ships** | Above this threshold, identity forgery becomes financially attractive |
| **90 days post-deploy** | Calendar-based hard stop |

**Recommended default:** whichever of "1,000 nullifiers" or "60 days" comes first.

### 9.7 v2 migration readiness

Before deploying v1, the v2 migration runbook MUST exist. See **`docs/product/anoncitizen-migration-runbook.md`**.

You are not ready to deploy v1 until you can answer these in 30 minutes:
1. How do dapps switch from v1 contract to v2 contract address?
2. How are the npm packages republished with new addresses?
3. How are users notified to re-prove against v2?
4. What is the deprecation timeline for v1?
5. Who owns and executes each step?

### 9.8 Cost & risk comparison

| Path | Upfront | Time to launch | Recovery cost if bug | Reputation hit |
|---|---|---|---|---|
| Audit-first (Stage 1 + Option D + bounty) | $3k–6k + $5k pool | +1–2 weeks | Low | Low |
| **Deploy-first, audit later (this plan)** | **$0–500 + $2–5k pool** | **Now** | **Medium (v2 + migration)** | **Medium** ("they shipped unaudited") |
| Deploy with nothing | $0 | Now | High | **Severe** |

The middle path is reasonable. The third path is not.

### 9.9 Concrete execution sequence

1. **Today:** Run §9.2 hardening. Fix everything flagged. (2 days, free)
2. **This week:** Deploy `v0.1.0-pre-audit` to Polygon PoS Mainnet with §9.3 labeling
3. **Same day:** Open $3k Hats.finance bounty (§9.4)
4. **Same day:** Write trigger into project tracker (§9.6)
5. **Pre-deploy:** Confirm `anoncitizen-migration-runbook.md` is complete (§9.7)
6. **When trigger hits:** Execute Option D audit ($3k–6k, 1 week), then re-deploy as `v1.0.0`

---

## 10. References

- [anon-aadhaar (reference project, already audited)](https://github.com/anon-aadhaar/anon-aadhaar)
- [zkSecurity public audit reports](https://www.zksecurity.xyz/reports)
- [Code4rena solo audit booking](https://medium.com/code4rena/booking-a-solo-audit-via-your-code4rena-profile-ff81dd053b67)
- [Sherlock 2026 audit pricing reference](https://sherlock.xyz/post/smart-contract-audit-pricing-a-market-reference-for-2026)
- [Zealynx 2026 audit cost guide](https://www.zealynx.io/blogs/audit-pricing-2026)
- [Trail of Bits — circomspect](https://github.com/trailofbits/circomspect)
- [Veridise — Picus under-constrainment detector](https://github.com/Veridise/Picus)
- [Cyfrin Aderyn static analyzer](https://github.com/Cyfrin/aderyn)
- [Hats.finance bug bounty platform](https://hats.finance/)
- [Immunefi bug bounty platform](https://immunefi.com/)
- [Privacy & Scaling Explorations (PSE)](https://pse.dev/)
- [zk-bug-tracker (historical ZK bug catalog)](https://github.com/0xPARC/zk-bug-tracker)
