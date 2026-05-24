# ADR-015: 180-day India-resident log retention per CERT-In April 2022 directions

## Status
Accepted

## Context
The CERT-In direction of April 28, 2022 requires intermediaries to retain system logs for **180 days**, with logs maintained **within India**. Factivist falls in scope as an intermediary serving Indian citizens. The retention requirement collides with our minimisation posture ([[ADR-010]]) only if logs contain PII — they must not. Memory anchor: S1 IT Act posture.

## Decision
Retain **180 days** of the following logs, all hosted in India region:
- **Application logs** — request/response metadata (route, status, latency, error code). No request bodies. No citizen identifiers.
- **WAF logs** — Cloudflare India PoP edge logs (IP, ASN, path, rule hits). IPs are treated as operational telemetry, not citizen identity (citizens are pseudonymous via nullifier per [[ADR-010]]).
- **DB audit logs** — Postgres write-ahead audit via Supabase, scoped to operator actions on moderation queue ([[ADR-006]]); citizen-content writes carry no identity.

Storage location:
- **Supabase `ap-south-1`** (Mumbai) for app + DB audit logs.
- **Cloudflare India PoP log retention** for WAF.

After 180 days logs are **hard-deleted**, not archived. PII redaction at the log emission boundary is enforced by a shared logger middleware in `packages/shared/`.

## Consequences

### Positive
- CERT-In compliant on both duration and locality.
- Compatible with [[ADR-010]] because no PII enters logs in the first place.
- India region also reduces latency for the actual user base.

### Negative
- Storage cost grows linearly with traffic; monitored via cost-scenarios.
- Cloudflare India PoP log export requires Enterprise tier — confirm plan covers 180d.

### Neutral
- If law changes the retention floor, change one config constant; design is parameterised.

## Alternatives considered
- **Logs in US region**: rejected — non-compliant with CERT-In locality requirement.
- **Indefinite retention**: rejected — minimisation; nothing is gained beyond 180 days that is worth the surface area.
- **Encrypted logs with operator-held key**: rejected — adds complexity, doesn't change the legal posture.

## References
- CERT-In Direction 20(3)/2022-CERT-In, dated 28 April 2022
- Memory: S1 IT Act posture
- Related: [[ADR-009]] (custom domain — India PoP), [[ADR-010]] (anonymity floor), [[ADR-016]] (DPDP)
