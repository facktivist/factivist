# Factivist — Cost to Run at Scale

Monthly operating cost from pilot through mass scale. Numbers are USD,
order-of-magnitude estimates intended to drive trade-off decisions — not
hard quotes. All cost categories assume the architecture in the
[product vision](./product-vison.md) (Postgres + AGE canonical store,
blockchain as public ledger, IPFS/Arweave for media, self-hosted AI).

---

## 1. Tiers

| Tier | Registered Citizens | Monthly Active Users (MAU) | Phase |
|------|---------------------|----------------------------|-------|
| **T1 Pilot** | 10,000 | 1,000 | 2–3 constituencies, soft launch |
| **T2 Early Growth** | 500,000 | 50,000 | Multi-state, organic + press |
| **T3 Growth** | 5,000,000 | 500,000 | Election-cycle inflection |
| **T4 Scale** | 50,000,000 | 5,000,000 | ~1% of Indian voters |
| **T5 Mass** | 500,000,000 | 50,000,000 | ~10% of Indian voters |

---

## 2. Per-MAU/month workload assumptions

| Workload | Per MAU/month |
|----------|---------------|
| Complaints submitted | 1 |
| Comments posted | 5 |
| Page views (web + mobile) | 30 |
| Media uploaded | ~10 MB (2 files × 5 MB avg) |
| AI moderation calls | 6 (1 complaint + 5 comments) |
| Search queries | 10 |
| RAG chat queries | 2 |
| Blockchain tx (post-batching) | 0.02 (Merkle-batched, 50× compression) |

These are conservative middle-of-road averages. Election cycles roughly
3× workload for ~6 weeks.

---

## 3. Monthly cost by tier

| Component | T1 Pilot | T2 Early | T3 Growth | T4 Scale | T5 Mass |
|-----------|----------|----------|-----------|----------|---------|
| Compute (web + api) | $40 | $400 | $5,000 | $40,000 | $300,000 |
| Database (Postgres + AGE) | $25 | $600 | $5,000 | $35,000 | $200,000 |
| Cache (Redis) + Queue | $0¹ | $150 | $800 | $5,000 | $30,000 |
| Search (Meilisearch) | $0¹ | $100 | $700 | $4,000 | $25,000 |
| Media — IPFS pinning (Pinata Picnic+) | $20 | $50 | $500 | $5,000 | $40,000 |
| Media — Arweave (selective retention)² | $70 | $1,000 | $10,000 | $80,000 | $700,000 |
| AI moderation (GPU) | $0³ | $400 | $2,000 | $15,000 | $100,000 |
| AI chat / RAG (GPU) | $0³ | $200 | $1,500 | $12,000 | $80,000 |
| Other AI (NER, dedupe, etc.) | $0³ | $100 | $500 | $3,000 | $20,000 |
| Blockchain gas (Polygon, batched) | $5 | $50 | $300 | $2,500 | $20,000 |
| CDN / bandwidth (Cloudflare) | $0 | $20 | $200 | $2,000 | $20,000 |
| Backups + observability | $5 | $50 | $500 | $4,000 | $25,000 |
| **Total / month** | **≈ $165** | **≈ $3,120** | **≈ $27,000** | **≈ $207,000** | **≈ $1.56M** |
| **Total / MAU / month** | $0.165 | $0.062 | $0.054 | $0.041 | $0.031 |

¹ Co-located on the same VPS in T1.
² Arweave is one-time per upload at **≈ $6.35–$8.00 per GB** (2026 market;
prices fluctuate with the AR token). Cash outlay each month = (new media
uploaded that month) × per-GB price. At T1 we retain 100 % of media on
Arweave because the volume is small (~10 GB/mo). From T2 onward the
numbers shown assume a **selective retention policy** — only
community-verified evidence is sent to Arweave (≈30 % at T2, scaling
down to ≈5 % at T5). Without selective retention, T5 Arweave alone would
cost ≈ $3.5M/month and is not affordable.
³ Self-hosted on a single small GPU (NVIDIA L4 spot, $0.10–$0.39/hr in
2026) shared across all AI workloads.

---

## 4. What drives cost most

In rough order:

1. **Media storage (Arweave + IPFS).** Permanent storage is the single
   biggest line item once the corpus grows. Mitigations: move only
   community-verified evidence to Arweave; keep the rest IPFS-only;
   compress aggressively; cap per-complaint media size.
2. **Database.** Postgres + AGE scales well, but graph queries are CPU
   hungry. Mitigations: tiered storage (hot/warm/cold partitions), pgBouncer,
   read replicas for analytics.
3. **AI moderation.** Cost is ~linear in submissions. Mitigations: cheap
   fast-path classifier before Llama Guard; batch inference; smaller
   distilled models for low-risk content.
4. **Compute.** Horizontal scaling on commodity boxes. Mitigations:
   serverless edge for read-heavy paths; co-locate small workers.
5. **Blockchain gas.** Already minor thanks to Merkle batching on Polygon
   PoS. If gas spikes, fall back to Polygon zkEVM or Arbitrum Nova.

---

## 5. Cost / MAU declines with scale

| Tier | Cost / MAU / month |
|------|---------------------|
| T1 Pilot | $0.165 |
| T2 Early Growth | $0.062 |
| T3 Growth | $0.054 |
| T4 Scale | $0.041 |
| T5 Mass | $0.031 |

Drivers:
- Fixed infrastructure (DNS, monitoring, base AI GPU) amortizes.
- Bulk discounts on storage and bandwidth.
- Polygon gas per-tx is constant; per-MAU cost drops via Merkle batching.

This is the unit economics curve to track. A pilot at ~$0.17/MAU/month
is manageable on grant funding; mass scale at ~$0.03/MAU/month is the
order-of-magnitude that decides whether the platform can be funded by
donations, ad-free institutional grants, or a public-interest endowment.
The T1 → T2 drop is steep because T1 pays the full storage + minimum
service-tier overhead on a small user base; fixed cost amortization
kicks in immediately at T2.

---

## 6. One-time costs

| Item | Estimated cost (USD), 2026 market |
|------|----------------------|
| Smart contract security audit (boutique, single small contract) | $3,000–$10,000 |
| Smart contract security audit (boutique bundle, 3–5 contracts) | $15,000–$40,000 |
| Smart contract audit competition (Code4rena / Sherlock / Cantina) | $20,000–$100,000 prize pool |
| Combined web + mobile + API pen test (mid-size scope) | $20,000–$45,000 per round |
| Legal consultation (international) | $2,000–$5,000 |
| Initial GPU rig (if self-bought) | $4,000–$8,000 |
| Privacy-friendly hosting setup | $500–$1,500 |
| Apple Developer Program (annual) + Google Play Console (one-time) | $99/yr + $25 |
| Brand + initial design system | included in repo |

---

## 7. Election-cycle spike planning

At every general or major-state election (≈ once per 6 months in India
when averaged), expect:

- **3×–5×** traffic and submission spike for 4–6 weeks.
- **10×** for the AI Chat feature (journalists, researchers).
- **2×** moderation queue depth.

Budget for a one-month surge at the next tier's monthly cost during every
major election cycle. For T3 Growth, that means setting aside ~$80k/year
in surge capacity.

---

## 8. Cost-control levers ranked

1. Tiered media retention (Arweave only for verified evidence).
2. Two-stage moderation (cheap fast-path → Llama Guard only on uncertain).
3. Aggressive Merkle batching of on-chain writes (50–100× tx compression).
4. Read replicas + edge caching for hot constituency pages.
5. Community-run IPFS pinning (volunteer nodes reduce paid pin storage).
6. Embedding cache (RAG chat reuses embeddings across queries).
7. Distilled / quantized models on cheaper GPUs (L4 instead of A100).

---

## 9. Funding implication

| Tier | Annualized cost | Indicative funding shape |
|------|------------------|---------------------------|
| T1 | ~$2,000 | Self-funded / single small grant |
| T2 | ~$37,000 | One mid-size grant or 1–2 large donors |
| T3 | ~$324,000 | Institutional grant (Ford, Omidyar, etc.) |
| T4 | ~$2.5M | Endowment-style funding, multiple funders |
| T5 | ~$19M | Public-interest endowment + government-of-people pact |

Numbers above ignore staff cost. Adding 5 engineers + 2 ops at T3 adds
roughly $400k/year (India + remote mix), bringing T3 total ≈ $720k/year.

---

*Every cell in this document is a working assumption. Revisit at every
tier transition; the highest-leverage edits are usually in §4 and §8.*
