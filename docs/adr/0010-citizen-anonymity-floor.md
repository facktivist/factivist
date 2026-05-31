# ADR-010: Citizen anonymity floor — never write national-ID/name/address/photo of citizen to any store; nullifier only

## Status
Accepted

## Context
Factivist's entire trust thesis collapses if a subpoena, breach, or insider can join citizen identity to complaints. Standard "we'll just encrypt" or "we'll hash" approaches still leak through joins, timing, IP logs, or compelled key disclosure. The only durable defence is **never collecting the data in the first place**.

## Decision
**The Factivist server side stores zero direct citizen identifiers.** Specifically: national ID number (Aadhaar/PAN/voter ID), legal name, residential address, and personal photo of the citizen-author are **never persisted to Postgres, Supabase Storage, application logs, audit logs, or any backup**. The only citizen-side identifier kept is the **nullifier** — a zero-knowledge-derived opaque value bound to (citizen-credential, epoch) that proves "this is a unique eligible citizen in this constituency" without revealing who. Photos in complaints are of **the issue**, not the citizen (see [[ADR-004]] EXIF strip). Comment authors are pseudonymous; same rule.

## Consequences

### Positive
- Subpoena resistance is structural, not procedural — there is nothing to hand over.
- Breach blast radius is bounded: leaked DB does not deanonymise anyone.
- Aligns with DPDP Act minimisation principle (see [[ADR-016]]).

### Negative
- Account recovery is impossible — losing the credential = losing the account. This must be UX-communicated.
- Spam/abuse defence must rely on nullifier rate-limits and content moderation, not identity bans.

### Neutral
- Operators may need to retain their own (operator, not citizen) identifiers for admin login — covered by separate ADR if needed in S2.

## Alternatives considered
- **Encrypted PII with KMS**: rejected — compelled key disclosure exists; insider risk remains.
- **Hashed PII**: rejected — small input space (Aadhaar is 12 digits, names are guessable); rainbow-table feasible.
- **PII held by a third-party identity provider**: rejected — moves risk to a vendor we cannot audit and that the same subpoena reaches.

## References
- Action plan §4.3 ADR-010
- Phase 1 sec-architect + zkp-researcher
- Related: [[ADR-003]] (verifier), [[ADR-004]] (EXIF), [[ADR-011]] (proving), [[ADR-016]] (DPDP)
