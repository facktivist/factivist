# ADR-017: Constituency picker is a combobox + breadcrumb compound (Phase 3 D1)

## Status
Accepted

## Context
[[ADR-013]] commits S1 to a manual constituency picker. Phase 3 design needed to lock the concrete UI compound: map vs combobox vs cascading selects vs tree. Map UI is heavy and accessibility-hostile; cascading selects are clumsy on mobile; trees require state we don't want. Memory anchor: S1 Phase 3 decisions (D1).

## Decision
Constituency picker = **HeroUI Combobox + Breadcrumb** compound:
- **Combobox** is the primary input: searchable, keyboard-first, fuzzy-matches across state / district / AC / PC names in English + native script.
- **Breadcrumb** renders the disambiguated selection as `State › District › AC/PC`, click any segment to re-scope the search.
- Same compound is used on web and mobile (HeroUI + HeroUI Native parity).
- No map UI in S1.

## Consequences

### Positive
- One pattern, two platforms — design + test cost stays linear.
- Searchable from keystroke 1 — fastest selection path for users who know their constituency name.
- Breadcrumb anchors users who don't, by letting them narrow top-down.
- WCAG 2.2 AA achievable (combobox role + keyboard nav baked into HeroUI primitive). See [[ADR-021]].

### Negative
- Users unfamiliar with state→district→constituency hierarchy may stall — mitigated by inline help text on first use.
- Combobox fuzzy match on ~5000 ACs needs index tuning; covered by the reference table layout in [[ADR-007]].

### Neutral
- Map UI revisited in S2 only if abandonment data justifies the bundle cost.

## Alternatives considered
- **Map-based picker**: rejected — heavy bundle, a11y-hostile, doesn't help users who can't read map labels in their language.
- **Three cascading native selects**: rejected — slow on mobile, no fuzzy search, fights keyboard users.
- **Tree component**: rejected — over-engineered for a flat-but-deep dataset.

## References
- Phase 3 design D1
- Memory: S1 Phase 3 decisions
- Related: [[ADR-007]] (constituency dataset), [[ADR-013]] (manual geo), [[ADR-021]] (WCAG 2.2 AA gate)
