# Civic Reference Datasets

This directory is for **local-only** civic reference datasets used during
research and development. **Nothing in this directory is committed** — the
data lives in **Supabase Storage** and is seeded into the database via a
Drizzle migration (planned in Phase 5).

## Why not in the repo

- File sizes range from 5 MB (topojson) to 50+ MB (raw shapefiles).
- Datasets refresh on a different cadence than code (delimitation orders,
  PIN directory updates, ECI supplements).
- Licensing varies per source (CC BY-SA 2.5 IN, GODL-India, etc.) —
  attribution required at runtime, not at clone-time.

See `Research-Constituency-Dataset` on the wiki for the canonical source
list, license terms, and refresh strategy:
<https://github.com/raveracker/factivist/wiki/Research-Constituency-Dataset>

## Local development

To work with civic data locally:

```bash
# Pull the latest seed bundle (planned helper — Phase 5 will land it):
# bun run db:seed:pull-civic

# Until then, drop files into this directory manually. They will NOT be
# committed (see .gitignore for the glob list).
```

## Supabase Storage layout (planned for Phase 5)

```
factivist-civic-data/
  delimitation/eci-2008-order.pdf
  delimitation/eci-2022-jk-supplement.pdf
  geometry/parliamentary-constituencies.topo.json
  geometry/assembly-constituencies.topo.json
  pin/india-post-pincode-2026-q1.csv
  taxonomy/categories-v1.json
```

The `civic-seed` migration (`packages/db/drizzle/00XX_civic_seed.sql`) will
pull these via signed URL at migration time, validate row counts, and
insert into the `states`, `districts`, `parliamentary_constituencies`,
`assembly_constituencies`, and `pin_districts` reference tables.

## Tracking

- Phase 5 issue for the seed pipeline: see Project #3 → Phase 5 → civic seed
  (filed by planner during Phase 1).
- Memory key: `s1-constituency-source` (in
  `reference_s1_constituency_source.md`).
