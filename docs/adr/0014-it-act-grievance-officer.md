# ADR-014: Single Grievance Officer with 24h ack / 36h takedown / 24h NCII SLA (IT Rules 2021 + 2022 amendments)

## Status
Accepted

## Context
Factivist S1 is an **intermediary** and a **Significant Social Media Intermediary (SMI)** under the IT Rules 2021, but **not** an SSMI (Significant Social Media Intermediary with the additional 5M-registered-user threshold). The IT Rules + 2022 amendments require a publicly named Grievance Officer, published acknowledgement SLA, content takedown windows for unlawful material, and a 24h takedown for non-consensual intimate imagery (NCII). Memory anchor: S1 IT Act posture.

## Decision
S1 ships with a **single Grievance Officer** model:
- **Publicly named** on `/legal/grievance` with email, postal address, and the published SLAs.
- **24-hour acknowledgement** of every grievance received.
- **36-hour takedown** for content adjudicated unlawful under the relevant Indian statute.
- **24-hour takedown for NCII**, including hash-based proactive removal where flagged.
- No automated/AI-driven content moderation is mandated at S1 (SSMI-tier obligation). Moderation queue is human-reviewed ([[ADR-006]]).
- Grievance Officer rotation + escalation chain documented internally; only the named officer is public-facing.

## Consequences

### Positive
- Statutorily compliant with IT Rules at SMI tier without over-engineering SSMI controls.
- Single named officer reduces ambiguity for complainants and regulators.
- Aligns with [[ADR-006]] moderation queue design.

### Negative
- 24h ack SLA requires on-call rotation even at low complaint volume.
- Single point of failure if the named officer is unreachable — mitigated by documented internal escalation.

### Neutral
- Re-classify obligations at the 5M registered-user threshold; SSMI brings additional duties (Chief Compliance Officer, Nodal Officer, automated tooling) — defer until triggered.

## Alternatives considered
- **Outsource grievance handling to a vendor**: rejected — accountability + speed both suffer; user trust degrades.
- **Email-only with no published SLA**: rejected — non-compliant with IT Rules 2021 §3(2).
- **Pre-emptive SSMI compliance**: rejected — premature optimisation; obligations and tooling vary by traffic class.

## References
- IT Rules 2021 + 2022 amendments
- Memory: S1 IT Act posture
- Related: [[ADR-006]] (moderation queue), [[ADR-010]] (anonymity floor), [[ADR-020]] (pii-leak flag reason)
