# Factivist — Mobile UI kit

Android-first because the [product vision](../../README.md) ships
`apps/mobile` to Android first (95%+ of the Indian smartphone market).
Three screens shown side by side in Android M3 device frames.

## Screens

1. **Verify (ZKP)** — onboarding. The phone explains that Aadhaar never
   leaves the device; the user scans the UIDAI QR client-side and a
   nullifier-bearing proof is what hits the chain.
2. **Feed** — top app bar with logo + bell, horizontal category chips,
   complaint cards, floating Plus FAB, M3 bottom nav.
3. **Complaint detail** — chips → title → body → evidence list →
   timeline. Sticky endorse pill above the bottom nav.

## Files

```
index.html         App shell — three AndroidDevice frames in a row.
android-frame.jsx  Material 3 status bar / nav bar / device shell.
```

Components and mock data are imported from `../web/components.jsx` and
`../web/data.js` so the visual language stays in lockstep with the web
kit — the same `Avatar`, `Chip`, `SeverityPill`, and `StatusChip` are
reused, just inside smaller frames.

## Native mapping

In the real app the components map to `heroui-native` (`Button`, `Card`,
`TextField`) via `@factivist/ui-native/components`, styled with Uniwind
against the same `--color-*` tokens. The web UI kit visuals translate
1:1 since both stacks consume the same `packages/ui/theme`.
