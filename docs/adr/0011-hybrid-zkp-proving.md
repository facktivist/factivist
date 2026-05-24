# ADR-011: Hybrid ZKP proving — rapidsnark on iOS high-end, snarkjs on Android / low-end, server-side fallback

## Status
Accepted

## Context
The anoncitizen circuit requires a Groth16 proof generated on the citizen's device so that no PII ever crosses the network (see [[ADR-010]]). Proving cost is the dominant UX friction: **rapidsnark** (C++/WASM hybrid) is 5–10× faster than pure JS but is realistically deployable only on iOS today, while **snarkjs** is universally available but slow. A non-trivial slice of low-RAM Android devices in our target geography cannot finish proving at all without OOM. ZKP research wiki: https://github.com/raveracker/factivist/wiki/Research-Anoncitizen-ZKP.

## Decision
Adopt a **tiered prover strategy**:
1. **iOS** — rapidsnark via native module. Default path.
2. **Android + web** — snarkjs in-process. Default path.
3. **Server-side prover** — opt-in fallback for devices that fail local proving (timeout, OOM, unsupported). Triggered only after explicit consent UI explaining the trust trade-off: the server sees the witness for the duration of proving but **still cannot persist any PII** ([[ADR-010]] holds; witness is held in memory only and zeroed post-proof).

Prover selection is platform- and capability-detected at runtime; users on the fallback path see a one-time consent modal.

## Consequences

### Positive
- Best-available UX per device class without forcing the slowest common denominator.
- No citizen is excluded from participation by hardware constraints.
- Local-first remains the default; server-side is exceptional and consented.

### Negative
- Three proving paths to test, build, and maintain (CI matrix expansion).
- Server-side fallback introduces a transient trust surface that must be documented in the threat model.

### Neutral
- Revisit Android native prover (rapidsnark JNI or arkworks-rs) in S2 when ecosystem matures (see [[ADR-018]]).

## Alternatives considered
- **snarkjs everywhere**: rejected — unusable on iOS premium devices where users expect snappy UX, and still fails on low-RAM Android.
- **Server-side proving for everyone**: rejected — undermines the local-first guarantee and concentrates witness exposure.
- **Block low-end devices**: rejected — excludes the citizens we most need to serve.

## References
- Phase 1 zkp-researcher findings
- Memory: S1 ZKP findings
- Related: [[ADR-003]] (verifier contract), [[ADR-010]] (anonymity floor), [[ADR-018]] (per-platform stack lock)
