# Surface 04 — Browse / filter by state → district → constituency

> Tracking issue: [#27](https://github.com/facktivist/factivist/issues/27)
> Implementation issue: [#63](https://github.com/facktivist/factivist/issues/63)
> Phase: 3 · Owner agent: `ux-lead`
> Last edited: 2026-05-23

## Summary

The discovery surface. Public, no auth required. Lets visitors drill down
state → district → Parliamentary Constituency (PC) → Assembly Constituency
(AC) and see complaints in that scope. Strictly chronological
(`created_at DESC`) — no algorithmic ranking (preserves IT Act §79(2)(b)
intermediary stance). J&K rows carry a `geometry_stale` notice.

## User story

> **As a** visitor (with or without a verified citizen)
> **I want to** see complaints near a place I care about, filtered by constituency and category
> **So that** I can read what's happening, contribute if verified, or just be informed.

## ATIDs gated

| ATID | What this surface must guarantee |
|------|-----------------------------------|
| `ATID-DISC-001` | Exact-match filter on `(state, district, pc, ac)`, paginated 20, `created_at DESC`, envelope has `total_count / page / pageSize / has_next`. |
| `ATID-DISC-002` | Invalid hierarchy → 400 `invalid_constituency_hierarchy` with the offending field. |
| `ATID-DISC-003` | J&K rows surface "Boundaries pending DataMeet update". |
| `ATID-DISC-005` | Non-`published` rows never visible to non-admin requesters. |

## Layout — WEB

```
┌──────────────────────────────────────────────────────────────────────┐
│  factivist     [ Browse ] [ About ] [ Legal ▾ ]    {handle | Sign in}│
├──────────────────────────────────────────────────────────────────────┤
│  Browse complaints                                                   │
│                                                                      │
│  ┌───── Filter ─────────────────────────────────────────────────┐    │
│  │  State  [Karnataka ▾]   District [Bengaluru Urban ▾]         │    │
│  │  PC     [Bangalore South ▾]    AC [BTM Layout ▾]             │    │
│  │  Category [All ▾]    Sort [Newest ▾]                         │    │
│  │                                       [ Clear ]   [ Apply ]  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Showing 1–20 of 84 complaints in BTM Layout AC                      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 🚧  Potholes on 100ft Road near Forum Mall                   │    │
│  │     Roads & Potholes · BLR-U · 2 h ago · 🚩 4 · 💬 7         │    │
│  │     User-submitted; not verified by Factivist.               │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 💧  No water for three days, Block 4                         │    │
│  │     Water & Sanitation · BLR-U · 5 h ago · 🚩 1 · 💬 2       │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  …                                                                   │
│                                                                      │
│  [ ← Prev ]                page 1 of 5                 [ Next → ]   │
└──────────────────────────────────────────────────────────────────────┘
```

## Layout — MOBILE

```
┌──────────────────────┐
│  Browse              │
│                      │
│ [Filters ▾]    [ + ] │  ← + opens composer if signed in
├──────────────────────┤
│ Karnataka            │
│  › Bengaluru Urban   │
│   › Bangalore South  │
│    › BTM Layout      │
│                      │
│ 84 complaints        │
├──────────────────────┤
│ 🚧 Potholes on 100ft │
│ Roads · 2h · 🚩4 💬7 │
│ User-submitted; …    │
├──────────────────────┤
│ 💧 No water 3 days   │
│ Water · 5h · 🚩1 💬2 │
├──────────────────────┤
│  …                   │
│                      │
│  [ Load older ]      │  ← pagination, not infinite scroll
└──────────────────────┘
```

Filter sheet (bottom sheet on mobile):

```
┌──────────────────────┐
│  Filter              │
│                      │
│ State    [▾]         │
│ District [▾]         │
│ PC       [▾]         │
│ AC       [▾]         │
│                      │
│ Category [▾]         │
│ Sort     [Newest ▾]  │
│                      │
│ [ Clear ] [ Apply ]  │
└──────────────────────┘
```

## Information architecture

- The constituency tree is the **primary** organising axis. Category is secondary.
- Sort is intentionally limited to `Newest` and `Most flagged` (last is opt-in; default Newest preserves §79(2)(b)).
- URL is canonical: `/browse?state=KA&district=BLR-U&pc=BLR-S&ac=BTM-LAYOUT&category=roads&page=1`. SSR-friendly.
- J&K state in the dropdown shows a small `⚠ stale` glyph; on selection, a banner renders above results.

Hidden by default:
- Per-result body preview (≤ 200 chars) — shown on hover on web, on tap on mobile if not auto-displayed.

## Copy

| Slot | Copy |
|------|------|
| Page title | `Browse complaints` |
| Empty state | `No complaints match this filter yet.` |
| Empty state subline | `Be the first to file one — if you're a verified citizen.` |
| J&K stale banner | `Constituency boundaries for Jammu & Kashmir are pending the DataMeet update. Results may not reflect the latest delimitation.` |
| Hierarchy error | `That combination of district, PC, and AC doesn't match our records. Please re-select.` |
| Apply CTA | `Apply` |
| Clear CTA | `Clear` |
| Per-result row prefix | `User-submitted; not verified by Factivist.` (rendered as faint footer per card) |

## Components used

- `Filter.ConstituencyTree` (shared with composer; mode `multi-filter`)
- `Filter.CategoryPicker` (multi-select on browse; single-select on composer)
- `Filter.SortControl`
- `Filter.FilterSheet` (mobile bottom sheet wrapper)
- `Complaint.Card` (compact variant — title, category, time, flag/comment counts, footer disclaimer)
- `Common.Pagination` (Prev/Next + page X of Y)
- `Common.StaleGeometryBanner` (J&K)
- `Common.EmptyState`

## States

| State | Trigger | Behaviour |
|-------|---------|-----------|
| Loading | SSR + revalidate | Skeleton cards (5). |
| Empty | Filter matches zero rows | `EmptyState` with prompt. |
| Error — 400 | Invalid hierarchy | Inline filter error; results panel cleared. |
| Error — 500 | Server | Toast retry; preserve filter state. |
| Stale (J&K) | `meta.geometry_stale=true` | Banner above results. |
| Offline (mobile) | Last cached page | Banner: "Offline — showing cached results." |

## Edge cases

- User selects PC without selecting district — dropdown enforces order (greys out future levels until parent picked).
- URL deep-link with stale constituency codes (post-delimitation) — server returns 400; UI maps it to the `EmptyState` with copy: "These constituency codes are no longer valid. Try the parent district."
- User changes filter mid-pagination — page resets to 1.
- Crawler bots — only `status='published'` rows are served; rate-limited at the edge via Cloudflare.
- Sort by `Most flagged` — only available to **verified** citizens (we don't want unauth visitors gaming the moderation queue by sorting by controversy). Anonymous default is `Newest` and cannot toggle. **TBD: user confirm.**

## Anonymity invariants (per ADR-010)

- No author identity rendered beyond `author_handle` per card.
- No "who flagged" hint.
- No referrer leakage to outbound links from per-result rows (rel=noopener,noreferrer on body links inside cards).

## Legal hooks

- **§79(2)(b)** — default sort is strictly chronological, no editorial ranking.
- **Rule 3(1)(d)** — non-published rows hidden (`ATID-DISC-005`).
- **`ATID-DISC-003`** — J&K stale notice is a legally-defensible posture for "we surfaced our best-known mapping with explicit caveats".

## Open questions

1. Should we let unauthenticated visitors sort by "Most flagged"? Privacy answer: no (queue-gaming). Civic answer: yes (transparency). **Needs user call.**
2. Should we expose a map view of complaints by AC heatmap in S1? Out of scope per PRD; deferring. Confirm.
3. Should the URL use slugs (`karnataka/bengaluru-urban/bangalore-south/btm-layout`) or codes (`KA/BLR-U/BLR-S/BTM-LAYOUT`)? Slugs are user-friendly but break across delimitation events. Recommend codes; flag for user review.
