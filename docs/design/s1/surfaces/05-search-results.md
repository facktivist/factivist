# Surface 05 — Postgres full-text search results

> Tracking issue: [#28](https://github.com/facktivist/factivist/issues/28)
> Implementation issue: [#64](https://github.com/facktivist/factivist/issues/64)
> Phase: 3 · Owner agent: `ux-lead`
> Last edited: 2026-05-23

## Summary

Free-text search across published complaints (body + title), implemented
with Postgres `tsvector` + GIN index per ADR-005. Combinable with the
constituency + category filters from Surface 04. Strictly ranked by
`ts_rank_cd` then `created_at DESC`. Sub-300 ms p95 at S1 volumes
(≤ 10k complaints).

## User story

> **As a** visitor
> **I want to** search complaints by keyword, optionally narrowed by constituency or category
> **So that** I can find specific incidents (e.g., "potholes Forum Mall") without browsing the whole tree.

## ATIDs gated

| ATID | What this surface must guarantee |
|------|-----------------------------------|
| `ATID-DISC-004` | tsvector GIN index used, p95 ≤ 300 ms at ≥ 100 complaints; ranked by `ts_rank_cd` then `created_at DESC`. |
| `ATID-DISC-005` | Non-`published` rows excluded. |
| `ATID-COMPL-001` | `tsvector` populated as `to_tsvector('english', body || ' ' || title)`. |

## Layout — WEB

```
┌──────────────────────────────────────────────────────────────────────┐
│  factivist  [ Browse ]  🔍 [ potholes Forum Mall            ]  Sign in │
├──────────────────────────────────────────────────────────────────────┤
│  Search results for "potholes Forum Mall"                            │
│                                                                      │
│  Filters: [Karnataka × ] [Bengaluru Urban × ]   [Clear]   [Refine ▾] │
│                                                                      │
│  12 results · sorted by relevance                                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 🚧 Potholes on 100ft Road near Forum Mall                    │    │
│  │    …several large **potholes** stretching from the **Forum   │    │
│  │     Mall** entrance to the…                                  │    │
│  │    Roads · BLR-U · 2 h ago · 🚩 4 · 💬 7                     │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 🚧 Bad road outside Forum Koramangala                        │    │
│  │    …**Forum** shopping mall in Koramangala has had broken    │    │
│  │     **potholes**…                                            │    │
│  │    Roads · BLR-U · 1 d ago · 🚩 0 · 💬 1                     │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ...                                                                 │
│                                                                      │
│  [ ← Prev ]                page 1 of 1                 [ Next → ]   │
└──────────────────────────────────────────────────────────────────────┘
```

## Layout — MOBILE

```
┌──────────────────────┐
│ 🔍 [potholes      ]  │
│    [Forum Mall    ]X │
├──────────────────────┤
│ 12 results · rel.    │
│ KA × BLR-U ×         │
│                      │
│ 🚧 Potholes on 100ft │
│ …**potholes** near   │
│   **Forum Mall**…    │
│ Roads · 2h · 🚩4 💬7 │
├──────────────────────┤
│ 🚧 Bad road outside  │
│   Forum Koramangala  │
│ …**Forum** mall…     │
│ Roads · 1d · 🚩0 💬1 │
├──────────────────────┤
│  ...                 │
│                      │
│ [   Load more   ]    │
└──────────────────────┘
```

## Information architecture

1. **Search box** is global (lives in the header on web, sticky bar on mobile).
2. **Active filters** stay sticky under the search box (chips with × to remove).
3. **Result count + sort selector** above the list.
4. **Result card** — title, snippet with `<mark>` around the matched tokens (server-rendered via `ts_headline`), category + constituency, time, flag/comment counts.

Hidden by default:
- Per-result body preview beyond ~200 chars.
- Advanced query syntax help (collapsed `Search tips` toggle).

## Copy

| Slot | Copy |
|------|------|
| Search placeholder | `Search complaints…` |
| Results heading | `Search results for "{query}"` |
| Empty state heading | `No matches for "{query}".` |
| Empty state subline | `Try a different keyword, or browse by constituency.` |
| Sort selector | `Relevance` (default) · `Newest` |
| Query too short | `Type at least 2 characters.` |
| Search tips link | `Search tips` |
| Tips body | `Use quotes for exact phrases. Use AND / OR / NOT for boolean queries.` |
| Refine CTA | `Refine` (opens the same FilterSheet as Surface 04) |

## Components used

- `Search.OmniBar` (header-mounted on web; sticky on mobile)
- `Search.ResultList`
- `Search.ResultCard` (variant of `Complaint.Card` with `<mark>` highlighting)
- `Search.ActiveFilterChips`
- `Search.TipsDisclosure`
- `Filter.FilterSheet` (reused from Surface 04)
- `Common.EmptyState`
- `Common.Pagination`

## States

| State | Trigger | Behaviour |
|-------|---------|-----------|
| Loading | SSR + revalidate | Skeleton cards; preserve previous query state. |
| Empty | Zero matches | `EmptyState` with prompt to browse. |
| Error — 400 | Query too short / malformed | Inline help under the search box. |
| Error — 500 | Server | Toast retry. |
| Slow query (> 1 s) | Real-time | Show "Searching…" spinner inline; never block the page. |
| Offline (mobile) | No network | Disable submit; suggest cached browse. |

## Edge cases

- Query contains SQL injection attempts — Drizzle parameterises; `tsvector` query also goes through `plainto_tsquery` (no operator interpretation).
- Query is a 5000-char paste — truncated to 200 chars before query construction.
- User searches in Hindi / Tamil — `tsvector` config is `english` per `ATID-COMPL-001`; results may be poor. We do not promise multi-lingual search in S1. **Flag as known limitation.**
- Combined search + filter returns 0 — empty state suggests removing one filter at a time.
- A result is removed mid-pagination — the next page may not have 20; we accept the "off-by-one" UX, no re-fetch.

## Anonymity invariants (per ADR-010)

- Same as Surface 03/04 — no author identity beyond `author_handle`.
- Query strings are **not** logged with PII; `dev_metrics.search_queries` records only the trimmed query + result count + latency.

## Legal hooks

- **§79(2)(b)** — relevance ranking is purely lexical (tsvector + ts_rank_cd); no editorial bias.
- **`ATID-DISC-005`** — non-published rows excluded via RLS.

## Open questions

1. Should the search bar live on every page (header omni) or only on `/search` and `/browse`? Recommendation: every page on web; only `/browse` and `/search` on mobile (limited space).
2. Multi-language `tsvector` — defer to S2? Recommend yes; flag now so a config column is added to the schema without migration churn.
3. Should we add a "Did you mean?" affordance? Postgres can do simple trigram fuzzy with `pg_trgm`. Cheap. Recommend yes for S1 lite version.
