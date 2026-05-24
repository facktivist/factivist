# ADR-005: Postgres FTS via tsvector + GIN, no Meilisearch in S1

## Status
Accepted

## Context
S1 needs keyword search over complaint titles and bodies in English + Hindi + a small set of Indic scripts. Meilisearch and Typesense were evaluated but add: a second persistence store, sync infra, an additional Indian-region deployment, and operational headache. S1 complaint volume (modelled at <100k rows by end of season) fits comfortably in Postgres FTS performance envelope.

## Decision
**Search uses Postgres full-text search via `tsvector` columns with GIN indexes.** A generated `tsvector` column combines `title` + `body` weighted A/B respectively, with `simple` config (no English-stemming side-effects on transliterated Hindi). Search is exposed through a single Drizzle query helper. No Meilisearch. No Typesense. No Elasticsearch.

## Consequences

### Positive
- Zero additional infra; backup story unchanged.
- Single source of truth — no sync drift between Postgres and a search index.
- RLS policies apply automatically to search results (free moderation enforcement).

### Negative
- Multilingual ranking is crude; Hindi typo tolerance is poor compared to a dedicated engine.
- BM25-style relevance tuning is limited to `ts_rank` weights.

### Neutral
- S3 may introduce Meilisearch behind a feature flag; the search interface in `apps/api/search/` is designed to allow this swap without changing call sites.

## Alternatives considered
- **Meilisearch**: rejected for S1 — operational cost, India hosting, sync complexity.
- **`pg_trgm` only**: rejected — fuzzy-match without ranking; doesn't compose with FTS scoring cleanly enough.
- **OpenSearch**: rejected — overkill, JVM ops, India hosting concerns.

## References
- Action plan §4.3 ADR-005
- Related: [[ADR-001]] (Drizzle is the only DB path; FTS DDL lives in migrations)
