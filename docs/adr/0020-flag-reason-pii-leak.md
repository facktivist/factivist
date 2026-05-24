# ADR-020: Distinct `pii-leak` flag reason in moderation taxonomy (Phase 3 D4)

## Status
Accepted

## Context
[[ADR-010]] structurally prevents Factivist from storing citizen PII — but user-uploaded **content** (photo captions, complaint body, comments) can still contain PII of *third parties*: a leaked Aadhaar number in a screenshot, a doxx attempt, an NCII image. Folding this into a generic `misinformation` or `harassment` bucket loses the signal on the most legally urgent category — the one that triggers the [[ADR-014]] 24h NCII / 36h takedown clock. Memory anchor: S1 Phase 3 decisions (D4).

## Decision
The flag-reason taxonomy in the moderation queue ([[ADR-006]]) includes **`pii-leak`** as a **distinct first-class reason**, alongside:
- `spam`
- `harassment`
- `misinformation`
- `off-topic`
- **`pii-leak`** ← new, distinct

The moderation queue UI:
- Surfaces `pii-leak` items with a **priority badge** and pins them to the top of the operator queue.
- Applies a **faster review SLA** to align with [[ADR-014]] takedown windows (NCII subset = 24h; other PII = 36h).
- Logs the flag → action chain in the operator audit log ([[ADR-015]] retention).

## Consequences

### Positive
- The most legally and ethically urgent category gets the visibility it needs.
- Operators can prioritise without re-reading flag context every time.
- Direct support for [[ADR-014]] SLA compliance — the queue itself enforces the clock.

### Negative
- One more reason in the picker; flag-reason UI must stay scannable (5 reasons is still fine).
- Operators need brief training on `pii-leak` vs `harassment` overlap (doxxing can be both).

### Neutral
- Taxonomy can evolve in S2 (e.g. split NCII as its own reason) without changing the queue mechanics.

## Alternatives considered
- **Fold into `harassment`**: rejected — buries the signal; harassment SLA is not the same as NCII SLA.
- **Free-text reason only**: rejected — no priority sort, no enforceable SLA, operator fatigue.
- **Automated PII detection only, no flag reason**: rejected — automated detection is unreliable on Indic scripts + screenshots; community flagging is the strongest signal source.

## References
- Phase 3 design D4
- Memory: S1 Phase 3 decisions
- Related: [[ADR-006]] (moderation queue), [[ADR-010]] (anonymity floor), [[ADR-014]] (grievance SLA), [[ADR-015]] (audit log retention)
