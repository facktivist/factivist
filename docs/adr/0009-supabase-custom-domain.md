# ADR-009: All API endpoints behind Supabase custom domain (India ISP mitigation)

## Status
Accepted

## Context
Direct `*.supabase.co` hostnames are intermittently throttled, slowed, or transparently DNS-poisoned by major Indian ISPs (observed on Jio, Airtel, BSNL during Phase 1 testing). This is not consistent enough to be a hard block, but is consistent enough to ruin first-load experience and break OAuth callbacks. Supabase offers custom domains as a paid feature.

## Decision
**Every Supabase endpoint we expose to end users — REST, auth, storage, realtime — is routed through a custom domain** (`api.factivist.in` or equivalent). No client code references `*.supabase.co`. DNS is operated by us; the custom domain CNAMEs to Supabase's edge but presents our certificate. Same applies to mobile API calls.

## Consequences

### Positive
- ISP-level signature matching on `supabase.co` is bypassed.
- We retain the option to swap backends without app updates if Supabase becomes hostile.
- Single, brandable origin for security headers and CORS.

### Negative
- Custom domain is a paid Supabase feature; cost line-item.
- DNS misconfiguration becomes a P0 outage — runbook required.

### Neutral
- TLS certificate renewal is automated by Supabase; we monitor expiry independently as defence-in-depth.

## Alternatives considered
- **Self-hosted Postgres in India**: rejected — replaces one operational burden with a larger one; loses managed auth, storage, RLS tooling.
- **Cloudflare proxy in front of Supabase**: considered; deferred to S2 if custom domain alone is insufficient.
- **Multi-region client retries**: rejected as primary mitigation — adds latency, doesn't solve DNS poisoning.

## References
- Action plan §4.3 ADR-009
- Phase 1 sec-architect ISP findings
- Related: [[ADR-004]] (Storage), [[ADR-015]] (CERT-In jurisdiction — proposed)
