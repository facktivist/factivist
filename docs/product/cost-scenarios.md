# Factivist — Cost Scenarios (Lean → Full)

Five stacked scenarios. Each one builds strictly on the previous: nothing
removed, only added. The goal is to ship the cheapest credible thing
first, then unlock features as adoption, evidence, and funding justify
the next tier.

- [`cost-at-scale.md`](./cost-at-scale.md) answers *"what does the full
  product cost as we grow from 1k to 50M MAU?"*
- **This doc** answers *"what's the smallest version we can ship for real
  citizens, and how do we layer in features without rewriting?"*

All monthly cost figures here assume **pilot scale (≈1k MAU)**. Multiply
through the §3 table in `cost-at-scale.md` for each scenario once you
graduate past pilot.

---

## At a glance

| # | Scenario | Monthly (pilot) | One-time | Headline capability |
|---|----------|-----------------|----------|---------------------|
| **S1** | Verifiable Lean MVP | **≈ $113**[^s1-rebase] | $3–10k | Web + Android + iOS, ZKP Aadhaar on-chain, manual moderation |
| **S2** | Tamper-Evident Pilot | **≈ $200** | $3–5k | Every complaint anchored on Polygon + IPFS + basic AI moderation |
| **S3** | Public Trust Stack | **≈ $450** | $16–43k | Full AI moderation pipeline, Arweave, full contract suite |
| **S4** | Accountability Layer | **≈ $930** | $23–50k | Report cards, AI chat, manifesto/judicial tracking, journalist API |
| **S5** | Mass-Scale Federation | scales via cost-at-scale.md | $30–75k/yr | DAO, multi-region, community moderators, redundancy |

Cost growth between S1 → S4 is roughly **2×–4× per scenario**, but each
step unlocks a category of trust the previous one cannot provide.

---

## S1 — Verifiable Lean MVP

**Purpose.** Ship the smallest version of the platform that already
delivers the two core promises: every contributor is a unique verified
Indian citizen (no Sybil), and that identity check is publicly
verifiable on the blockchain. Everything else is deferred.

**Features in scope**
- Web (Next.js 16) **and** mobile app on Android + iOS (single Expo + Expo Router codebase)
- ZKP Aadhaar citizen verification via anon-aadhaar
- `CitizenVerifier.sol` deployed to Polygon PoS mainnet (small, audited)
- Anonymous citizen credential (nullifier set on chain — duplicate Aadhaars rejected)
- Text + 1–3 photo complaint submission
- Category + constituency tagging
- Public browse / filter by state / district / constituency
- Comments (community flag → manual moderation queue)
- Postgres full-text search (no Meilisearch yet)

**Deferred**
- `ComplaintRegistry` and other smart contracts (complaints live in Postgres only; no per-complaint chain anchoring yet)
- AI moderation (Llama Guard, IndicBERT) — replaced by human queue
- IPFS / Arweave (media on Supabase Storage)
- PWA
- Meilisearch, AI Chat, report cards, judicial tracking, journalist API
- Multi-language beyond English + Hindi UI

**Stack delta**
| Add | Reason |
|-----|--------|
| Next.js 16 web + Hono on Bun API | Web product |
| Expo + Expo Router (Android + iOS builds via EAS) | Mobile on both platforms from day one |
| anon-aadhaar contracts + client | Unique-citizen ZKP |
| `CitizenVerifier.sol` on Polygon PoS | Public on-chain verification |
| The Graph hosted subgraph (free) | Read citizen-set off-chain |
| Supabase Postgres Pro | Canonical store |
| Supabase Storage | Photos (no IPFS yet) |
| Cloudflare free | DNS + DDoS + CDN |
| Manual moderation queue (Postgres-backed) | Lowest-cost human review |

**Monthly cost (≈1k MAU)** ≈ **$113** at standard gas / **~$95** at off-peak[^s1-rebase]

| Line | $/mo | Notes |
|------|-----:|-------|
| Supabase Pro | $25 | |
| Compute (web + api) | $30 | |
| Expo EAS Starter (Android + iOS, $45 build credit / 3k MAU updates) | $19 | |
| Polygon gas (ZKP verify, per-call) | **$18.76** | Re-baselined 2026-05-23 post-Chicago hardfork (PIP-88, 2026-05-21). Standard pricing 337.8 gwei × ~487k gas × POL $0.091. See wiki [Research-Polygon-Gas](https://github.com/facktivist/factivist/wiki/Research-Polygon-Gas) §4. **Volatility note:** off-peak (~56.7 gwei) collapses this line to **~$3/mo**; spike worst-case (~1000 gwei) pushes it to **~$56/mo**. |
| The Graph hosted (free up to 100k queries/mo) | $0 | |
| Cloudflare free | $0 | |
| Backups (Supabase included) | $0 | |
| Misc | $20 | |
| **Total (standard)** | **$112.76** | within 15% of original $100 target |
| **Total (off-peak)** | **~$95** | if launch coincides with low-traffic window |

[^s1-rebase]: **2026-05-23 re-baseline:** Polygon line moved from **$5/mo** (Phase 1 estimate at $0.005–$0.02/call × batched assumption) → **$18.76/mo** (Phase 2 measurement, per-call, post-Chicago hardfork). This is a **+275% line-item drift** but only a **+13% total drift** ($99 → $113), well within the 15% budget tolerance. Drivers: (a) Chicago hardfork (PIP-88) repriced BN254 precompiles 1.5×–3.6× and cold SLOAD 2.6× on 2026-05-21, raising per-verify gas from 265–285k → 472k–502k; (b) decision to model **per-call** rather than batched (batching deferred to S2 `ComplaintRegistry` Merkle worker). See wiki [Research-Polygon-Gas](https://github.com/facktivist/factivist/wiki/Research-Polygon-Gas) and `reference_s1_cost_drift.md` memory.

**One-time** **$3,000–10,000**
- `CitizenVerifier.sol` audit by a boutique ZKP-focused security reviewer (single-contract review on a chain like Spearbit / Cantina solo or an indie researcher referred via Code4rena's marketplace): **$3k–10k**. Cheaper than a top-tier firm because anon-aadhaar's underlying circuits and `Verifier.sol` were already audited by PSE/Ethereum Foundation — we only need a review of our integration glue (nullifier set, citizen-credential issuance).
- anon-aadhaar circuit trusted setup is already done by PSE — integrate
  their proving keys, no additional ceremony required.
- Apple Developer Program $99/yr and Google Play Console $25 one-time
  (rolled into the audit budget).

**Graduate when**
- ≥ 5,000 verified citizens registered, OR
- First takedown request or seizure scare — at which point per-complaint anchoring (S2) becomes the differentiator, OR
- More than 5% of complaints get flagged for review — manual queue is no longer enough.

### S1 Cost drift log

| Date | Change | Magnitude | Decision |
|------|--------|-----------|----------|
| 2026-05-23 | Polygon line re-baselined +275% post-PIP-88 (Chicago hardfork); $5 → $18.76/mo. Total moved $99 → $113. | +13% total | **Accept drift** — within 15% budget tolerance. See `reference_s1_cost_drift.md` memory and wiki [Research-Polygon-Gas](https://github.com/facktivist/factivist/wiki/Research-Polygon-Gas). Escalation if Total exceeds $115/mo at standard gas OR if standard gas line itself exceeds $25/mo (a further +33%). |

---

## S2 — Tamper-Evident Pilot

**Purpose.** Make every individual complaint independently verifiable and
permanent, not just the citizen identity. Stop relying on Supabase as the
sole record of what was submitted.

**Features added on top of S1**
- `ComplaintRegistry.sol` — every complaint hash anchored on Polygon (Merkle-batched, 1 tx per N complaints)
- IPFS pinning (Pinata starter) for media; Supabase Storage stays as warm copy
- Basic Llama Guard 3 moderation (shared GPU, batched, cheapest tier)
- Email / Telegram notifications for status changes (low-volume)
- The Graph subgraph extended to read complaint anchors

**Deferred**
- Other smart contracts (Consensus, Profile, ReportCard)
- Multilingual hate-speech model (English + Hindi only via Llama Guard, no IndicBERT fine-tune)
- Arweave permanence
- iOS app

**Stack delta from S1**
| Add | Reason |
|-----|--------|
| `ComplaintRegistry.sol` on Polygon | Per-complaint public ledger |
| Pinata starter (100 GB) | First IPFS pinning layer |
| 1 shared GPU instance (L4 spot, batched) | Llama Guard 3 |
| Merkle-batch worker | 50× tx compression on Polygon |
| Notification service (email/Telegram bot) | Status updates |

**Monthly cost (≈1k MAU)** ≈ **$200**
- S1 base $90 · Pinata starter $20 · GPU (L4 spot, ~2h/day batched) $40 · Polygon batched gas $10 · Compute uplift $20 · Misc $20.

**One-time**
- `ComplaintRegistry.sol` audit add-on (boutique reviewer; storage / access-control only, no cryptography): **$3,000–5,000**. Bundle with the S1 reviewer for a discount.

**Graduate when**
- Pilot crosses 25k verified citizens, OR
- A media story creates a one-day spike Postgres FTS can't keep up with, OR
- Two or more constituencies need report cards or analytics.

---

## S3 — Public Trust Stack

**Purpose.** Become the platform a journalist or activist would actually
depend on. Full automated moderation, permanent evidence, the rest of the
smart-contract suite.

**Features added on top of S2**
- Full AI moderation pipeline:
  - Llama Guard 3 (English) + IndicBERT/MuRIL fine-tune for Hindi + 4 South Indian languages
  - NER for accused persons, location extraction → constituency
  - Duplicate detection via pgvector embeddings
- Meilisearch full-text search
- Arweave for community-verified evidence (one-time per upload)
- Remaining smart contracts: `ConsensusVoting`, `ProfileRegistry`, `ReportCard`
- Redis cache + BullMQ queue (media processing, chain tx jobs)
- Media metadata stripping (Sharp + FFmpeg)
- tus resumable uploads

**Deferred**
- AI Chat / RAG
- Promise/manifesto tracking
- Judicial tracking
- Journalist API
- iOS app
- DAO governance

**Stack delta from S2**
| Add | Reason |
|-----|--------|
| IndicBERT / MuRIL fine-tuned | India-specific hate-speech |
| pgvector | Embeddings + dedupe |
| Meilisearch single-node | Real search UX |
| Arweave (per-upload one-time) | Permanent evidence layer |
| Redis + BullMQ | Background work |
| Consensus, Profile, ReportCard contracts | Endorsements + profiles |
| 1 dedicated GPU (L4) full-time | Cover moderation volume |

**Monthly cost (≈1k MAU)** ≈ **$450**
- S2 base $200 · GPU L4 dedicated ($0.44/hr × 730hr ≈ $321 → effective ~$200 shared across moderation + other AI workloads) · Pinata Picnic $20 · Meilisearch self-hosted on existing VPS $0 · Upstash Redis pay-go ~$20 · Arweave selective (~30% of media → permanent): ~$20/mo cash · Misc $-10 (S2 spot GPU retired).

**One-time**
- Smart-contract audit for 3 new contracts (Consensus, Profile, ReportCard) — boutique bundle or a Code4rena / Sherlock / Cantina contest. Boutique bundle: **$15,000–25,000**; competitive contest minimum useful prize pool: **$20,000–40,000**. Either way budget **$15k–40k**.
- Initial IndicBERT / MuRIL fine-tune (labeled data + compute): **$1,500–3,000**

**Graduate when**
- Any journalist starts citing the platform in reporting,
- A political party publicly responds to a complaint,
- Or a state assembly election cycle approaches (need report cards in flight).

---

## S4 — Accountability Layer

**Purpose.** Turn the corpus into a public accountability tool, not just a
complaint log.

**Features added on top of S3**
- Leader report cards (constituency-level scorecards)
- Promise / manifesto tracking
- Judicial case tracking module
- AI Chat (RAG over the complaint corpus, with citations)
- Advanced analytics dashboard
- Public API for journalists and researchers (rate-limited, JWT)
- PWA build
- Notification system (per-area new complaints, status updates)
- Multi-language: 10+ Indian languages in moderation + UI
- Election-cycle surge capacity provisioning

**Stack delta from S3**
| Add | Reason |
|-----|--------|
| Constituency / official aggregation jobs | Report cards |
| Manifesto ingestion + promise extractor (small instruct model) | Promise tracking |
| Judicial-case ingestion (eCourts scraper) | Case tracker |
| RAG pipeline (query rewrite + retrieval + small instruct model) | AI Chat |
| Public API gateway + JWT issuer | External access |
| 9 additional language fine-tunes | Reach the rest of India |
| Second GPU (L4) for RAG | Keep moderation latency stable |

**Monthly cost (≈1k MAU)** ≈ **$930**
- S3 base $450 · second GPU L4 $360 · Meilisearch on dedicated $40 · Redis uplift $20 · API gateway $20 · Pinata uplift $20 · Misc $20.

**One-time**
- Combined web + mobile + API pen test (mid-size scope, 2026 market): **$20,000–45,000**
- eCourts integration & per-state scrapers: **$3,000–5,000**

**Graduate when**
- MAU crosses 50k, OR
- Two or more states have active constituency coverage demanding regional ops, OR
- A funder backs a multi-year endowment.

---

## S5 — Mass-Scale Federation

**Purpose.** Survive at India scale: multi-region, multi-jurisdiction,
community-governed, redundant.

**Features added on top of S4**
- DAO governance for platform decisions
- Community moderator system (paid + reputation-weighted)
- Multiple IPFS pinning nodes across jurisdictions
- Multiple domain mirrors + content-addressable mirrors
- Multi-region compute (active-active across two privacy-friendly hosts)
- Automated election-cycle surge provisioning
- Annual security audits + quarterly pen tests
- Bug bounty program
- Data export tooling (for RTI activists, journalists, courts)
- Disaster recovery: ledger-replay tooling that rebuilds Postgres from chain + IPFS if seized

**Stack delta from S4**
| Add | Reason |
|-----|--------|
| Governance contracts (Snapshot or on-chain) | DAO decisions |
| Multi-region Postgres replication | Survive a regional outage / seizure |
| Multiple pinning providers (Pinata + Filebase + community) | No single point of failure for media |
| Bug bounty platform (Immunefi / HackerOne) | Continuous external review |
| Ledger-replay scripts | Recovery rehearsal |

**Monthly cost.** Scenario-specific cost stops being meaningful here —
use `cost-at-scale.md` directly. As a rough anchor, *adding* the
federation layer to whatever MAU tier you're in costs an extra **5–8 %**
on top of the base.

**One-time / annual**
- Annual security audit + pen test cycle: **$30,000–60,000/yr** (full contract re-review at $15k–25k + web/mobile/API pen test at $20k–45k, on rotation).
- Bug bounty pool (Immunefi or Sherlock, smaller-program tier): **$25,000–100,000/yr** committed reserve; larger Web3 programs run $1M+ but those are post-S5 maturity.

**Graduate when** the platform itself is no longer the bottleneck —
governance is. Decisions about category taxonomy, moderation policy, and
funding allocation should be made by verified citizens, not by the
maintainers.

---

## Feature matrix

| Feature | S1 | S2 | S3 | S4 | S5 |
|---------|----|----|----|----|----|
| Text + photo complaints | ✓ | ✓ | ✓ | ✓ | ✓ |
| Constituency browse / filter | ✓ | ✓ | ✓ | ✓ | ✓ |
| Web (Next.js) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mobile app (Android + iOS, Expo) | ✓ | ✓ | ✓ | ✓ | ✓ |
| ZKP Aadhaar verification on-chain | ✓ | ✓ | ✓ | ✓ | ✓ |
| `CitizenVerifier` contract | ✓ | ✓ | ✓ | ✓ | ✓ |
| `ComplaintRegistry` anchoring | | ✓ | ✓ | ✓ | ✓ |
| Consensus / Profile / ReportCard contracts | | | ✓ | ✓ | ✓ |
| IPFS media | | ✓ | ✓ | ✓ | ✓ |
| Arweave permanence | | | ✓ | ✓ | ✓ |
| Llama Guard moderation | | basic | full | full | full |
| Indic hate-speech model | | | ✓ | ✓ (10+ langs) | ✓ |
| NER + location extraction | | | ✓ | ✓ | ✓ |
| Meilisearch | | | ✓ | ✓ | ✓ |
| Report cards | | | | ✓ | ✓ |
| Promise tracking | | | | ✓ | ✓ |
| Judicial tracking | | | | ✓ | ✓ |
| AI Chat (RAG) | | | | ✓ | ✓ |
| Public API for journalists | | | | ✓ | ✓ |
| Notification system | | basic | basic | full | full |
| DAO governance | | | | | ✓ |
| Multi-region redundancy | | | | | ✓ |
| Community moderator system | | | | | ✓ |
| Annual pen test / audit cycle | | | | | ✓ |

---

## How to use this document

1. **Identify the current scenario** the deployed platform is in.
2. **Identify the next scenario** the evidence (or funding) justifies.
3. The "Stack delta" + "Graduate when" rows of the next scenario become
   the work plan.
4. Re-cost monthly using `cost-at-scale.md` once MAU outgrows pilot —
   the *features* live here, the *scale curve* lives there.

---

## Principles behind the layering

- **No throwaway code between scenarios.** Each scenario's stack delta is
  strictly additive; nothing is removed. S1 → S2 doesn't replace the
  signup flow, it adds anchoring on top. S2 → S3 doesn't replace
  moderation, it adds a multilingual model in front.
- **Verification is non-negotiable.** Even at S1, every citizen is
  verified by ZKP and that verification is recorded on the public
  ledger. Sybil resistance is the floor, not a feature you can ship
  without.
- **Lean Postgres-first.** The canonical store is the same Supabase
  Postgres at every scenario. IPFS, Arweave, additional smart contracts
  layer on top — so S1 isn't a different product from S5, just less of
  it.
- **AI is the last expense.** Manual moderation in S1 caps cost and
  forces early calibration of what *should* be moderated. AI is added in
  S2 at the smallest viable size, then scaled.
- **Smart contracts grow with product surface.** `CitizenVerifier` ships
  in S1 because identity is the floor; `ComplaintRegistry` in S2 because
  per-complaint trust is the next required step; Consensus / Profile /
  ReportCard wait for S3 because they need the product features to be
  worth auditing.
