# ADR-008: Mobile = single Expo + Expo Router codebase, Android + iOS share 100% business logic

## Status
Accepted

## Context
The mobile team is 1–2 engineers in S1. Maintaining native Android (Kotlin) + native iOS (Swift) apps doubles labour and triples QA. Expo with the New Architecture (Fabric + Hermes) and Expo Router covers every screen S1 needs. Platform-specific code is unavoidable for proving (see [[ADR-018]]) but must be the exception, not the rule.

## Decision
**The mobile app is a single Expo + Expo Router codebase in `apps/mobile/`.** All business logic, screens, navigation, validation, and API calls are shared 100% between Android and iOS. Platform-specific code is restricted to `*.ios.ts` / `*.android.ts` files for: (a) ZKP proving runtime selection per [[ADR-018]], (b) any native module shim. UI uses HeroUI Native + Uniwind (Tailwind v4) for visual parity.

## Consequences

### Positive
- Single codebase → 50% labour, one bug = one fix.
- EAS Build + EAS Update lets us ship JS-only patches without store review.
- React Native New Architecture gives near-native perf for our workload.

### Negative
- Native ZKP proving (rapidsnark/snarkjs) requires `*.ios/android.ts` splits — accepted, scoped, isolated.
- Some HeroUI Native components diverge subtly from web HeroUI — design tokens unify them but tests must cover both.

### Neutral
- Expo Modules API is available for future native integrations without ejecting.

## Alternatives considered
- **Native Android (Kotlin) + native iOS (Swift)**: rejected — team size, duplication.
- **Flutter**: rejected — team has zero Flutter experience; would also re-implement HeroUI tokens.
- **React Native bare workflow (no Expo)**: rejected — loses EAS Build, Update, push notifications; we'd reinvent.

## References
- Action plan §4.3 ADR-008
- Related: [[ADR-018]] (asymmetric proving), [[ADR-019]] (single tab order)
