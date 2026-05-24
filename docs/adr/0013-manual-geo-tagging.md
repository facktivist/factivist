# ADR-013: Manual constituency picker — no geocoding or PIN-derived auto-assignment in S1

## Status
Accepted

## Context
A complaint's constituency tag determines which MLA/MP it routes to — getting it wrong defeats the product. Two "automatic" paths exist:
1. **PIN → constituency lookup** — but PIN→PC is **not 1:1** (single PIN can span multiple ACs; single AC spans many PINs). Constituency research wiki documents this explicitly: https://github.com/raveracker/factivist/wiki/Research-Constituency-Dataset.
2. **GPS reverse-geocode** — reliable when allowed, but costs battery, requires runtime permission, and silently surveils the citizen — directly hostile to [[ADR-010]].

Forcing either as the default is a correctness *and* privacy regression.

## Decision
**S1 ships a manual constituency picker only.** A combobox + breadcrumb compound (state → district → AC/PC) is the sole default path. Constituency data is served from **4 read-only Drizzle reference tables** (states, districts, parliamentary constituencies, assembly constituencies) populated from the layered dataset in [[ADR-007]].

GPS-assisted picking is a **power-user opt-in** behind an explicit consent toggle ("use my location to suggest a constituency"). PIN-based auto-derivation is **not shipped** in S1; the picker may show district hint from PIN as a non-authoritative suggestion only.

## Consequences

### Positive
- Zero silent location collection; citizen always picks knowingly.
- No incorrect routing from PIN→PC overlap edge cases.
- Reference tables are static + small → trivially cacheable, no live geo service.

### Negative
- Slightly higher friction at compose time (3 taps vs 0).
- Citizens unfamiliar with constituency boundaries may pick wrong; mitigation = breadcrumb shows the human-readable trail.

### Neutral
- Re-evaluate GPS-assisted default in S2 after measuring picker abandonment rate.

## Alternatives considered
- **PIN→PC auto-assign**: rejected — not 1:1, would route silently to the wrong representative in border PINs.
- **GPS-default with opt-out**: rejected — incompatible with [[ADR-010]] privacy posture.
- **Map-based picker**: rejected — heavy bundle, accessibility-hostile, deferred to S2+ (see [[ADR-017]]).

## References
- Constituency research wiki
- Memory: S1 constituency source, S1 Phase 3 decisions
- Related: [[ADR-007]] (constituency dataset), [[ADR-010]] (anonymity floor), [[ADR-017]] (combobox compound)
