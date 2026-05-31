# ADR-019: Same bottom-tab order on iOS + Android, no FAB (Phase 3 D3)

## Status
Accepted

## Context
React Native + HeroUI Native let us diverge nav per platform — iOS HIG suggests tab bar; Material 3 leans on FAB + bottom app bar; many cross-platform apps split the difference and confuse both audiences. Phase 3 design needed a single answer. Memory anchor: S1 Phase 3 decisions (D3).

## Decision
**Identical 4-tab bottom navigation on iOS and Android.** Same labels, same icons, same order. **No floating action button on either platform.**

Primary content-creation action (compose complaint) is an **inline composer** on the Feed tab, not a global FAB. The composer is reachable in one tap from any tab via the Feed-tab icon, which is positioned to keep thumb travel short on both platforms.

Tab order is locked in [[ADR-021]]'s a11y baseline so screen-reader rotor order matches visual order on both platforms.

## Consequences

### Positive
- One nav model to design, build, test, document.
- Cross-platform parity reduces user confusion for Factivist's many dual-device journalists.
- No FAB means no platform-conditional layouts; gesture-free nav helps a11y.

### Negative
- Diverges from Material 3 convention; some Android users may expect a FAB for compose.
- Inline composer on Feed adds vertical scroll cost on first-load.

### Neutral
- Tab order itself documented in the design system package; changes require an ADR amendment.

## Alternatives considered
- **FAB on Android, tab bar on iOS**: rejected — two designs, two test matrices, parity loss for users on both platforms.
- **Drawer nav**: rejected — discoverability cost on mobile, hides primary destinations.
- **Top tabs**: rejected — thumb-hostile on tall phones, conflicts with native back-gesture zones.

## References
- Phase 3 design D3
- Memory: S1 Phase 3 decisions
- Related: [[ADR-008]] (Expo single codebase), [[ADR-021]] (WCAG 2.2 AA gate)
