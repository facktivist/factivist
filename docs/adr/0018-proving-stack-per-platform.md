# ADR-018: Proving stack per platform — rapidsnark on iOS, snarkjs on Android (Phase 3 D2)

## Status
Accepted

## Context
[[ADR-011]] establishes the hybrid proving strategy in principle. Phase 3 design needed to lock the concrete stack per platform for S1 build planning — engineering can't ship "we'll decide later". Memory anchor: S1 Phase 3 decisions (D2).

## Decision
For S1:
- **iOS** → **rapidsnark** via a thin React Native native module wrapper. Targets iPhone 11+ (A13+); older devices fall back to the server prover path from [[ADR-011]].
- **Android** → **snarkjs** in-process (JS thread). No native rapidsnark JNI binding in S1.
- **Web** → snarkjs (same as Android).
- Server-side fallback applies to all platforms on capability failure ([[ADR-011]]).

Android native proving (rapidsnark JNI or an arkworks-rs port) is **explicitly deferred to S2**, contingent on (a) ecosystem maturity and (b) measured snarkjs abandonment rate on real Android traffic.

## Consequences

### Positive
- Engineering scope for S1 ZKP work is unambiguous and bounded.
- iOS gets best-in-class UX where the user base most expects it.
- Android ships *something working* in S1 rather than blocking on native binding work.

### Negative
- Android prove time will be noticeably slower than iOS until S2 — must be telemetered + surfaced honestly in UX copy.
- Two prover code paths to keep in sync as the circuit evolves.

### Neutral
- The decision is reversible per platform — switching Android to native in S2 doesn't require a circuit change.

## Alternatives considered
- **Snarkjs everywhere in S1**: rejected — wastes the iOS performance opportunity, hurts retention.
- **Wait for Android native and ship simultaneously**: rejected — pushes S1 launch by an unknown quarter; unacceptable.
- **Third-party hosted prover for Android**: rejected — same trust-surface concerns as the server fallback, without the consented-fallback framing.

## References
- Phase 3 design D2
- Memory: S1 Phase 3 decisions, S1 ZKP findings
- Related: [[ADR-003]] (verifier), [[ADR-011]] (hybrid proving)
