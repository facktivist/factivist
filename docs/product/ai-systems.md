# Factivist — AI Systems & Use Cases

The platform uses a small portfolio of AI models for moderation, search,
extraction, analytics, and conversational lookup. This document catalogs
every AI system, what it is used for, how it is deployed, and the
trade-offs that shape the choice.

The default deployment posture is **self-hosted, multilingual, India-aware**.
Third-party APIs are allowed only as fallbacks; nothing user-identifiable
ever leaves our infrastructure.

---

## 1. Catalog

| # | System | Stage | Primary Use | Model | Hosting |
|---|--------|-------|-------------|-------|---------|
| 1 | Safety Classifier | Pre-publish | Hate, doxxing, violence detection on complaints + comments | Llama Guard 3 (8B) | Self-hosted GPU |
| 2 | Multilingual Hate-Speech Detector | Pre-publish | India-specific slurs, caste/communal triggers | Fine-tuned IndicBERT / MuRIL | Self-hosted CPU/GPU |
| 3 | Named Entity Recognition (NER) | Pre-publish | Identify accused persons, officials, organizations | Fine-tuned XLM-R / IndicNER | Self-hosted CPU |
| 4 | Location Extractor | Pre-publish | Map free-text addresses → constituency / pincode | Geo-NER + gazetteer lookup | Self-hosted CPU |
| 5 | Duplicate Detector | Pre-publish | Find near-duplicates of existing complaints | Sentence embeddings + vector search | Self-hosted (pgvector) |
| 6 | Sentiment & Evidence Scorer | Pre-publish | Rate complaint specificity and credibility | Small classifier on top of embeddings | Self-hosted CPU |
| 7 | RAG Chat ("AI Chat") | User-facing | Question-answering over the complaint corpus | Embeddings + retrieval + small instruct model | Self-hosted GPU |
| 8 | Promise / Manifesto Tracker | Analytics | Compare politician manifesto promises to outcomes | Embedding similarity + classifier | Self-hosted CPU |
| 9 | Constituency Analytics Summarizer | Analytics | Generate plain-language constituency report cards | Small instruct model | Self-hosted GPU |
| 10 | Appeal Triage | Post-publish | Re-evaluate flagged content after community report | Llama Guard 3 + human queue | Self-hosted GPU |

---

## 2. Moderation Pipeline (Pre-Publish)

```
User submits complaint/comment
        ↓
[Stage 1] Automated Pre-screening
  - Language detection
  - Llama Guard 3: Safety classification
  - Custom hate speech model: India-specific slurs & communal triggers
  - Duplicate detection (similarity to existing complaints)
        ↓
[Stage 2] Content Analysis
  - Named entity recognition (identify accused persons)
  - Location extraction (map to constituency)
  - Sentiment analysis
  - Evidence quality scoring
        ↓
[Stage 3] Decision
  - PASS → Publish immediately
  - REVIEW → Queue for community moderator review
  - REJECT → Notify user with reason, allow appeal
        ↓
[Stage 4] Post-publication monitoring
  - Periodic re-evaluation of flagged content
  - Community reports trigger re-review
```

### 2.1 Custom Safety Taxonomy for India

Fine-tune Llama Guard 3 with these India-specific categories:
1. **Communal hate speech** — Anti-Muslim, anti-Hindu, anti-Christian, anti-Sikh rhetoric
2. **Caste-based abuse** — Casteist slurs, derogatory caste references
3. **Gender-based hate** — Misogynistic threats, victim-blaming language
4. **Doxxing** — Revealing private addresses, phone numbers of citizens (not public officials)
5. **Incitement to violence** — Calls for mob justice, lynching, arson
6. **Defamation without evidence** — Claims against private citizens without supporting evidence
7. **Misinformation markers** — Unverifiable claims presented as facts

### 2.2 Multilingual Support

Priority languages for moderation:
1. Hindi (40%+ of users)
2. English (20%+)
3. Tamil, Telugu, Kannada, Malayalam (South India)
4. Bengali, Odia (East India)
5. Marathi, Gujarati (West India)
6. Punjabi, Urdu (North India)

Base models: **IndicBERT** / **MuRIL** (Google) for Indian-language
representations, fine-tuned on labeled hate-speech corpora.

### 2.3 Why Llama Guard 3 (8B)

- Purpose-built for content safety classification.
- Supports custom safety taxonomies (you define what's harmful).
- Fine-tunable on Indian context (caste slurs, communal triggers).
- Runs on a single A10G or L4 GPU (~$0.50–$0.75/hr cloud).
- Self-hosted → no third-party data sharing.
- Multilingual (Hindi, Tamil, Telugu, Bengali, etc.).

Alternatives considered: Mistral moderation, OpenAI moderation. Latter
requires sending content to OpenAI — disqualified by policy.

---

## 3. RAG Chat ("AI Chat" feature, vision §2.10)

Allows citizens, journalists, and researchers to ask natural-language
questions over the complaint corpus.

**Examples**
- "Show me women-safety complaints in Bengaluru South over the last 6 months."
- "Which constituency in Maharashtra has the most unresolved infrastructure issues?"
- "List complaints involving an officer named X."

**Architecture**
```
question
  → query rewriting (small LLM)
  → embedding lookup over Postgres pgvector
    (filtered by state/district/constituency/category if extracted)
  → top-k complaints + structured filters
  → generation step: small instruct model produces an answer
    with inline citations linking to the source complaints
```

**Guardrails**
- The model never invents complaint IDs — outputs cite real DB rows or say
  "no matching complaint found".
- PII redaction pass before any text is returned (no nullifier-tied data
  ever flows through).
- Rate-limited; flagged questions go through Llama Guard.

---

## 4. Promise / Manifesto Tracking

Compares public-official manifesto promises (ingested from official
documents) to:
- Complaint outcomes in their constituency.
- Asset disclosures over time.
- Attendance and voting records.

Implementation:
- Ingest manifesto → split into promise statements (small instruct model).
- For each promise, retrieve outcomes via embedding similarity + structured
  joins (e.g., promise about water → water-category complaint trends).
- Score: kept / partial / unkept / contradicted.

---

## 5. Constituency Analytics Summarizer

Powers the leader report cards (vision §2.3) and §2.9 analytics.

Inputs: structured aggregates from Postgres (complaint counts, resolution
rates, sentiment trends).
Output: a short narrative summary with citations to the underlying
aggregates, generated by a small instruct model.

Guardrails:
- Generation runs only over numeric aggregates, never raw text — bounds
  hallucination scope.
- Outputs are cached and versioned; any update re-renders all dependent
  pages.

---

## 6. Deployment Topology

```
┌─────────────────┐    ┌──────────────────────┐
│   Hono API      │ ─► │ vLLM (Llama Guard 3) │
│  (apps/api)     │    │ + instruct model     │
└────────┬────────┘    └──────────────────────┘
         │
         ├─► CPU services (NER, language detect, location, dedupe)
         │      via FastAPI sidecar
         │
         └─► pgvector (Supabase Postgres) for embeddings + RAG retrieval
```

- **vLLM** for the GPU-bound models (Llama Guard, instruct model).
- **FastAPI sidecar** for the CPU-bound models so the Hono API stays
  light. The API calls these as internal RPC.
- **pgvector** lives in the same Supabase Postgres as the relational data
  — no separate vector DB, no extra ops surface.

---

## 7. Fallback Strategy

When self-hosted is unavailable (cold-start, GPU outage):

1. Llama Guard → Perspective API (Google) for toxicity scoring only;
   never send PII or identifying metadata.
2. Embedding model → Cohere multilingual (no content storage by Cohere on
   the relevant plan).
3. RAG chat → degrades to keyword search (Meilisearch) with a banner
   noting AI is offline.

Fallbacks are off by default and require an explicit operator toggle.

---

## 8. Evaluation & Monitoring

- **Eval set**: a labeled corpus of ~5k complaints across categories and
  languages, with human moderator decisions. Rerun after every model
  update.
- **Drift monitor**: hourly check that pass/review/reject rates stay
  inside expected bands per category.
- **Bias audit**: quarterly review of moderation decisions by language and
  category to detect disproportionate rejection.
- **Community appeals**: every rejected complaint can be appealed; the
  rate and reversal rate are tracked per model version.

---

## 9. Cost

See [cost-at-scale.md §AI/ML](./cost-at-scale.md) for per-tier cost
projections. The dominant variable cost is GPU-hours for moderation;
batching and a fast/slow two-stage classifier keep the budget linear in
submissions rather than total traffic.
