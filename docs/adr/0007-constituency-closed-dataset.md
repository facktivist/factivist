# ADR-007: Constituency hierarchy is closed reference dataset loaded via Drizzle seed

## Status
Accepted

## Context
India's electoral hierarchy — State → District → Parliamentary Constituency → Assembly Constituency — is the spine of complaint classification and routing. The data changes only at delimitation events (years apart). Treating it as user-editable or fetching from an external API at runtime would (a) introduce a single point of failure, (b) break the offline-first mobile experience, and (c) open a censorship vector if the upstream blocks India IPs.

## Decision
**The constituency hierarchy is a closed, versioned reference dataset shipped in `packages/db/seed/constituencies/`** and loaded via a Drizzle migration seed. Tables (`states`, `districts`, `parliamentary_constituencies`, `assembly_constituencies`) are immutable to application writes — only seed migrations can modify them. Slug primary keys per [[ADR-012]].

## Consequences

### Positive
- Offline-friendly: mobile can ship the entire hierarchy in-bundle if needed.
- Reproducible builds: every developer machine + CI has identical reference data.
- No external API dependency at request time.

### Negative
- A delimitation change (next expected post-2026 census) requires a coordinated migration + mobile app release.
- The seed file is large (~4000 ACs); kept in `.json` not Drizzle TS literal to avoid TS compiler pressure.

### Neutral
- A version column on each row records the delimitation cycle (`2008` for current), enabling future side-by-side hierarchies.

## Alternatives considered
- **Fetch from ECI API at runtime**: rejected — no stable public API, ISP blockability, latency.
- **CMS-managed (Supabase-edited) reference**: rejected — risks accidental edits, no versioning, no replay.
- **GeoJSON as the source**: deferred; geometry is not needed in S1 since picker is manual per [[ADR-013]].

## References
- Action plan §4.3 ADR-007
- Related: [[ADR-001]] (Drizzle is the only path), [[ADR-012]] (slug PKs), [[ADR-013]] (manual picker)
