# ADR-021: axe-core WCAG 2.2 AA gate enforced in CI per surface

## Status
Accepted

## Context
Accessibility regressions are silent until a screen-reader user files a complaint — by which point the surface is shipped, the pattern is copied, and the cost to fix is multiplied. Phase 3 already committed a baseline (commit 4bc2a41) for axe-core per surface; this ADR formalises the policy so it survives team changes and refactors.

## Decision
Every shippable surface (web and mobile-web equivalent) ships with a **per-surface axe-core baseline test**. CI enforces:
- **AA-level rules only** in S1 — WCAG 2.2 AA is the gate. AAA rules are aspirational, not blocking.
- **No new violations** — the baseline is a snapshot of currently-known issues per surface; PRs that introduce a violation not in the baseline fail CI.
- **Baseline reductions are encouraged** — fixing a baseline-listed violation must update the baseline downward in the same PR.
- React Native surfaces use the analogous **`@axe-core/react-native`** path; same AA-only, same baseline model.

Tooling lives in `tooling/` shared config; per-surface baselines live alongside the surface.

## Consequences

### Positive
- Accessibility quality only improves over time — ratchet, not aspiration.
- Catches issues at PR time, before merge, before ship.
- Operationalises [[ADR-017]] and [[ADR-019]] a11y assumptions — they're verified, not asserted.

### Negative
- CI gets slower; per-surface axe run is the dominant new cost. Mitigated by parallelising in CI matrix.
- False positives in axe rules occasionally require justified suppressions — tracked in baseline with a reason comment.

### Neutral
- AAA promotion deferred to S2 per surface; some surfaces (e.g. composer) may go AAA earlier where the audience demands it.
- S1 AAA opt-in surfaces (active 2026-05-26): `02-composer`, `08-legal`. Wired via per-surface `extraTags: ["wcag2aaa", "wcag21aaa", "wcag22aaa"]` in `scripts/a11y/a11y-baseline.json`; runner support lives in `resolveTagsForSurface()` in `scripts/a11y/run-axe-baseline.ts`. Baseline still applies — new AAA violations on these two surfaces fail CI, snapshotted ones do not.

## Alternatives considered
- **Manual a11y review only**: rejected — doesn't scale, doesn't catch regressions in PRs.
- **Lighthouse a11y score gate**: rejected — coarse, opinionated weighting, no per-rule control.
- **AAA-as-gate**: rejected — many AAA rules are subjective or domain-inappropriate; would force suppressions that erode trust in the gate.

## References
- Commit 4bc2a41 (Phase 3 a11y baseline)
- WCAG 2.2 AA spec
- Related: [[ADR-008]] (Expo single codebase — same gate model on RN), [[ADR-017]] (combobox a11y), [[ADR-019]] (tab order = rotor order)
