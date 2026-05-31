# ADR-016: DPDP Act §16 N/A at S1; minimisation alignment via ADR-010

## Status
Accepted

## Context
The Digital Personal Data Protection Act 2023 imposes specific obligations on **Significant Data Fiduciaries** (SDF) under §16 — DPO appointment, mandatory DPIA, independent audit, algorithm risk assessment. Classification as SDF is by notification and turns on volume, sensitivity, and risk of processing personal data. At S1, Factivist processes **no personal data on the citizen side** ([[ADR-010]]) and operator-side data is small-scale admin information. Memory anchor: S1 IT Act posture.

## Decision
**DPDP §16 obligations are Not Applicable at S1.** Specifically:
- No Data Protection Officer required.
- No DPIA required.
- No independent audit required by DPDP (unrelated audits e.g. security/SOC can still happen).

The **minimisation principle** underlying DPDP is enforced **structurally** by [[ADR-010]] — there is no citizen personal data to protect because none is collected. Operator data is bounded to login credentials + moderation action history.

**Re-evaluation triggers**:
- Reaching 1M monthly active users → review whether SDF notification is likely.
- Any expansion of data collection scope (e.g. operator KYC, donor records, location auto-tagging) → re-run this ADR.
- Government notification designating Factivist (or its class) as SDF → immediate re-evaluation regardless of scale.

## Consequences

### Positive
- Compliance burden matches actual processing risk.
- The minimisation argument is *architectural*, not procedural — durable across audits.
- Leaves headroom for legitimate compliance investment when triggered.

### Negative
- Must actively monitor MAU + scope changes; complacency risk if no one owns the re-evaluation trigger.
- Some institutional partners may expect "we have a DPO" as a checkbox — handled in legal comms, not engineering.

### Neutral
- DPDP rules of practice are still draft as of S1; ADR will be revised once final rules are notified.

## Alternatives considered
- **Pre-emptive SDF compliance**: rejected — premature; DPO and DPIA add cost without changing risk posture given [[ADR-010]].
- **Argue DPDP doesn't apply at all**: rejected — Factivist is clearly a data fiduciary for operator data; §16 obligations are the only ones being deferred.

## References
- DPDP Act 2023, esp. §16
- Memory: S1 IT Act posture
- Related: [[ADR-010]] (anonymity floor), [[ADR-014]] (grievance officer), [[ADR-015]] (CERT-In retention)
