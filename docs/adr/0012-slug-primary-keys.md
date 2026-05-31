# ADR-012: Slug-based primary keys for human-facing entities (complaints, constituencies, categories)

## Status
Accepted

## Context
URLs like `/complaint/9f3a-...-uuid` are unreadable, unshareable, and SEO-hostile. Complaints, constituencies, and categories are precisely the entities that get cited in WhatsApp forwards, press articles, and Wikipedia footnotes — readability and stability of the URL matter as much as the data itself. UUIDs also leak nothing useful to journalists or researchers scanning a URL.

## Decision
Use **slug (text) as primary key** for human-facing entities: `Complaint`, `Constituency`, `Category`. Slugs are:
- **Unique** (DB constraint) and **immutable post-publish** — once a complaint is public, its slug never changes; rename = redirect row.
- **Generated server-side** from the title + a short collision suffix where needed (e.g. `bbmp-pothole-koramangala-7th-block-a4f`).
- **URL-safe** (kebab-case, ASCII transliteration of Indic scripts retained in a separate `title_native` column).

Surrogate `id bigserial` is used **only** where slug is not feasible (e.g. internal join tables, audit rows, ephemeral records). Foreign keys to slug-PK tables use the slug column directly.

## Consequences

### Positive
- Shareable, citeable, memorable URLs — directly serves the journalism + accountability use case.
- SEO surface is meaningful out of the box; no canonical-URL gymnastics.
- Slugs double as natural deduplication keys for imports.

### Negative
- Slug collisions require generation logic + suffix retries on insert.
- Text PKs are wider than `bigint` — modest index bloat (acceptable at S1 scale).
- Immutability means typos in published slugs become permanent (mitigated: editorial review before publish state).

### Neutral
- Slug locale handling (Hindi/Kannada/Tamil titles) standardised on ASCII transliteration; native title preserved separately.

## Alternatives considered
- **UUID PK + slug column**: rejected — two-key indirection, easy to leak UUIDs in API responses by accident.
- **Bigserial PK + slug column**: rejected — same indirection problem; slug becomes second-class.
- **Hash-based slugs (e.g. short hash of content)**: rejected — unreadable, defeats the purpose.

## References
- Phase 1 architect notes
- Related: [[ADR-005]] (Postgres FTS — slug as tsvector input), [[ADR-007]] (constituency dataset)
