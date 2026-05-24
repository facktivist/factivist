# ADR-003: CitizenVerifier.sol is the only smart contract in S1

## Status
Accepted

## Context
A full on-chain complaint registry, reputation token, and DAO governance contract were initially scoped. Phase 1 ZKP and legal research surfaced that (a) the L2 + ZK verifier alone hits S1's anonymity guarantee, (b) every additional contract multiplies audit cost, and (c) S1's "ship in 8 weeks" budget can absorb one auditable contract, not three.

## Decision
**S1 deploys exactly one Solidity contract: `CitizenVerifier.sol`,** forked from the anoncitizen reference circuit's verifier. It accepts a Groth16/PLONK proof + public signals (nullifier, epoch) and marks the nullifier as spent. No complaint storage on-chain. No reputation token. No DAO. All other state lives in Postgres.

## Consequences

### Positive
- One audit scope → tractable for S1 budget.
- Cheap gas: a single `verifyProof` + `mapping.set` per complaint.
- No on-chain content means no on-chain censorship surface.

### Negative
- Re-introducing a ComplaintRegistry in S2 will need a migration path for nullifiers (kept; see [[ADR-010]]).
- No on-chain proof that a complaint existed at time T — Postgres timestamps are the only anchor.

### Neutral
- L2 choice (Polygon zkEVM vs Base vs Optimism) is deferred to deployment-time decision; not an ADR.

## Alternatives considered
- **ComplaintRegistry.sol + CitizenVerifier.sol**: rejected for S1 — doubles audit, adds gas per complaint, and the registry adds nothing the Postgres table doesn't already provide.
- **No contract, off-chain ZK only**: rejected — loses the public, tamper-evident nullifier set; reopens Sybil risk.
- **Use existing Semaphore verifier as-is**: rejected — citizen-credential constraints (constituency binding) require custom circuit; verifier must match.

## References
- Action plan §4.3 ADR-003
- Phase 1 zkp-researcher findings
- Related: [[ADR-010]] (anonymity floor), [[ADR-011]] (hybrid proving)
