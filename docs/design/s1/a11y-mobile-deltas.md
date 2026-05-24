# S1 — Mobile Accessibility Deltas (HeroUI Native + Uniwind)

> Phase: 3 · Owner agent: `a11y-auditor` · Last edited: 2026-05-23
> Companion to [`./a11y-baseline.md`](./a11y-baseline.md). This document
> covers only the deltas — anything not mentioned here inherits from the
> baseline.

## Why a separate document

Mobile accessibility on React Native + HeroUI Native + Uniwind has a different
toolchain (no axe-core, no DOM, no `aria-*`), different OS affordances
(VoiceOver, TalkBack, Dynamic Type, Reduce Motion, Bold Text), and different
gesture surface (long-press, swipe, pinch, drag). The Phase 7 axe CI gate
covers web only; mobile is verified through:

1. ESLint + a custom rule for missing `accessibilityLabel` / `accessibilityRole` on touchable wrappers.
2. Detox E2E that drives the app via accessibility ids — if a test cannot find the element by `testID` **and** `accessibilityLabel`, the suite fails.
3. A manual VoiceOver + TalkBack pass on every release candidate, scripted by [`./a11y-mobile-deltas.md#manual-pass-checklist`](#manual-pass-checklist).
4. Native a11y inspection via Argent MCP's `describe` tool during dev — see project rule `.claude/rules/argent.md`.

## Reanimated worklet considerations for screen reader announcements

Reanimated 4 worklets run on the UI thread; they **cannot** call JS APIs
directly. Screen reader announcements must go through `runOnJS` or
`scheduleOnRN`. Pattern:

```ts
import { AccessibilityInfo } from 'react-native'
import { runOnJS } from 'react-native-reanimated'

const announce = (message: string) => {
  AccessibilityInfo.announceForAccessibility(message)
}

// inside a worklet
useAnimatedReaction(
  () => sharedValue.value,
  (current, previous) => {
    if (previous !== null && Math.abs(current - previous) > 0.5) {
      runOnJS(announce)('Photo reorder complete')
    }
  },
)
```

**Hard rule:** never announce from inside a `withTiming` callback running on
the UI thread. Always hop to JS.

For complex flows (proof generation progress), prefer `AccessibilityInfo.isScreenReaderEnabled()`
guarded announcements at meaningful checkpoints (10%, 50%, 100%) rather than
streaming percentage updates that overwhelm the announcement queue.

## Gesture-handler alternatives (SC 2.5.7 — Dragging Movements)

react-native-gesture-handler powers our drag interactions. Every drag MUST
have a non-drag alternative:

| Gesture | Surface | Non-drag alternative |
|---|---|---|
| Long-press + drag to reorder photos | Composer (Surface 02) | "Move up" / "Move down" buttons exposed on each thumbnail. Both buttons are focusable VoiceOver actions. |
| Swipe-to-delete comment | Complaint detail (Surface 03) | "Delete" button revealed via the row's `…` overflow menu. The swipe is a shortcut, not the only path. |
| Pull-to-refresh in Browse / Search | Surfaces 04, 05 | A "Refresh" button in the screen header — also exposed via the VoiceOver actions rotor. |
| Pinch-to-zoom in lightbox | Complaint detail | "Zoom in" / "Zoom out" / "Reset" buttons in the lightbox toolbar. |

**Long-press for context menus** — on iOS, VoiceOver's Magic Tap (two-finger
double-tap) substitutes; on Android, TalkBack's Actions menu substitutes. We
expose all context-menu items as `accessibilityActions` on the touchable
parent:

```ts
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Comment by anon-7f3a"
  accessibilityActions={[
    { name: 'reply', label: 'Reply' },
    { name: 'flag', label: 'Flag this comment' },
    { name: 'copy', label: 'Copy comment text' },
  ]}
  onAccessibilityAction={(e) => handleAction(e.nativeEvent.actionName)}
>
  …
</Pressable>
```

## Native a11y label conventions

HeroUI Native wrappers in `packages/ui/native/` MUST pass through these props
without renaming them. If a wrapper component needs to compose a label,
expose it via an `a11y` prop bag, never silently override.

| Prop | Convention |
|---|---|
| `accessibilityLabel` | Sentence-case, ends with no punctuation. e.g. `"Add photo to complaint"`. |
| `accessibilityHint` | Sentence-case, ends with a period. Used sparingly — most labels are self-explanatory. e.g. `"Opens the camera or photo picker."`. |
| `accessibilityRole` | Use the closest native role. `"button"`, `"link"`, `"header"`, `"image"`, `"text"`, `"adjustable"`, `"summary"`, `"tablist"`, `"tab"`, `"checkbox"`, `"radio"`, `"radiogroup"`, `"switch"`, `"alert"`, `"none"`. Never invent a role. |
| `accessibilityState` | `{ disabled, selected, checked, busy, expanded }` — toggle the right one for the component. |
| `accessibilityValue` | For sliders, progress bars, steppers — `{ min, max, now, text }`. ZKP proof progress uses `{ min: 0, max: 100, now: <pct>, text: "Generating proof, 47 percent" }`. |
| `accessibilityLiveRegion` (Android) / `accessibilityElementsHidden` (iOS) | Use to skip decorative elements and to flag dynamic content. Avoid `assertive` — pick `polite` for non-critical updates. |
| `importantForAccessibility` (Android) | `"yes"`, `"no"`, `"no-hide-descendants"`. Use `no-hide-descendants` on skeleton placeholders so TalkBack does not read empty boxes. |
| `accessibilityViewIsModal` (iOS) | Set on modals/bottom-sheets so VoiceOver does not escape underneath. |

### Per-surface mobile label inventory

| Surface | Element | `accessibilityRole` | `accessibilityLabel` |
|---|---|---|---|
| 01 — Onboarding | Step indicator | `header` | `"Step 1 of 4: Why we verify"` |
| 01 — Onboarding | QR scanner viewfinder | `image` | `"Camera viewfinder, scan your Aadhaar QR code"` |
| 01 — Onboarding | "Use file upload instead" | `button` | `"Upload Aadhaar QR image from your photo library"` |
| 01 — Onboarding | Proof-progress bar | `adjustable` (with `accessibilityValue`) | `"Generating zero-knowledge proof"` |
| 02 — Composer | "Add photo" | `button` | `"Add photo, up to 3"` |
| 02 — Composer | Photo thumbnail | `image` | `"Photo {n} of {total}: {alt or 'untitled'}"` |
| 02 — Composer | "Move up" thumbnail action | `button` | `"Move photo {n} up"` |
| 02 — Composer | "Remove" thumbnail action | `button` | `"Remove photo {n}"` |
| 02 — Composer | Constituency picker trigger | `button` | `"Constituency: {selected or 'none selected'}"` (with `accessibilityHint="Opens the constituency picker."`) |
| 02 — Composer | Alt-text editor | `none` (the wrapper) — `TextInput` carries its own role | `"Description for photo {n}, for screen reader users"` |
| 03 — Detail | Photo gallery item | `image` | `"{alt} — photo {n} of {total}. Double tap to enlarge."` |
| 03 — Detail | "Flag" button | `button` | `"Flag this complaint"` |
| 04 — Browse | Filter chip (active) | `button` | `"{label}, selected. Double tap to remove filter."` (with `accessibilityState={{ selected: true }}`) |
| 04 — Browse | Filter chip (inactive) | `button` | `"{label}. Double tap to add filter."` |
| 04 — Browse | Result card | `link` | `"{title}, {constituency}, {relative time}, {comments} comments"` |
| 05 — Search | Search input | `search` | `"Search complaints"` |
| 06 — Profile | Tab "Complaints" | `tab` | `"Complaints by {handle}"` |
| 09 — Offline | Offline banner | `alert` | `"You're offline. Browsing cached complaints."` |
| 09 — Offline | Skeleton row | `none` + `importantForAccessibility="no-hide-descendants"` | — |

## Dynamic type / font-scale handling

HeroUI Native components inherit our Tailwind v4 type ramp. The `text-*`
utility scales relative to the base font-size, which we **must** keep tied to
the system font-scale via `PixelRatio.getFontScale()`.

Hard rules:

1. **No fixed `lineHeight` in pixels.** Use unitless multipliers (`leading-tight`, `leading-snug`, etc.) so line-height scales with the user's font preference.
2. **No `maxFontSizeMultiplier`** unless absolutely required (e.g. a single-line marketing slogan). When set, document the reason inline.
3. **Test at iOS Accessibility5 and Android 200%** before merge. Detox snapshot baselines exist at both scales.
4. **Composer's photo grid** collapses from 3-up to 2-up at font-scale ≥ 1.3 and to 1-up at font-scale ≥ 1.7.
5. **Tab bars and bottom sheets** must keep their labels readable; if the label truncates, use `accessibilityLabel` to carry the full text and let the visual ellipsise.

## Bold text (iOS) honor

iOS exposes a "Bold Text" accessibility setting. We expose it via
`AccessibilityInfo.isBoldTextEnabled()` and trip the design tokens to use
`font-semibold` as the new "regular" — this is a one-time check at app start,
re-evaluated when the app returns to foreground.

## Reduce motion (iOS + Android) honor

Hard rules:

1. Every Reanimated `withTiming` / `withSpring` wraps a check on `AccessibilityInfo.isReduceMotionEnabled()`. When `true`, the duration drops to 0 or the spring switches to a no-op.
2. The proof-progress spinner becomes a `accessibilityValue`-driven progress bar (no rotation).
3. Photo lightbox open/close is instant under reduce-motion.
4. Pull-to-refresh tension animation is disabled — the refresh fires immediately on threshold.

## Inspector workflow during development

Use the `argent-device-interact` skill + Argent MCP tools to inspect a11y
trees live:

```text
describe                       # current screen, native a11y tree
native-describe-screen         # iOS accessibility tree (richer)
debugger-component-tree        # React Native component tree
```

When `describe` reports a `Pressable` without `accessibilityLabel`, that is a
P0 finding — file an issue on the component owner before merging.

## Manual pass checklist

Run all of the following before signing off a release candidate:

- [ ] iOS — VoiceOver swipe through every surface; verify reading order matches visual order.
- [ ] iOS — Bold Text on → check Composer + Onboarding step labels.
- [ ] iOS — Dynamic Type at Accessibility5 → check Composer + Browse + Search.
- [ ] iOS — Reduce Motion on → check Onboarding + Lightbox.
- [ ] iOS — Smart Invert on → check that no photo is inverted (we mark photos with `accessibilityIgnoresInvertColors` per HIG).
- [ ] Android — TalkBack swipe through every surface.
- [ ] Android — Font size 200% → check Composer + Browse + Search.
- [ ] Android — High contrast text on → check Composer.
- [ ] Android — Disable animations developer setting → check Lightbox + Tabs.
- [ ] Both — Test offline shell: airplane mode → enter app → verify offline banner is announced.
- [ ] Both — Test ZKP proof generation announcement cadence (every 10% via `AccessibilityInfo.announceForAccessibility`, never streaming).

## Detox a11y assertions

Every Detox E2E test that exercises a UI element MUST locate the element by
its `accessibilityLabel` (or `testID` if the label is dynamic). A locator
like `by.text(...)` is allowed only for prose; interactive elements use the
label.

```ts
await element(by.label('Add photo, up to 3')).tap()
await expect(element(by.label('Photo 1 of 3: untitled'))).toBeVisible()
```

This is enforced by an ESLint rule in `apps/mobile/e2e/.eslintrc.cjs` that
flags `by.id` and `by.text` calls on touchable elements as warnings — the
test suite owner has to silence it explicitly with a justifying comment.

## Open questions

- Should we ship a custom React Native a11y lint plugin (similar to
  `eslint-plugin-jsx-a11y` for React DOM), or rely on a hand-curated list of
  rules? **Recommendation:** ship a small custom plugin in
  `tooling/eslint-config/` during Phase 5 — the cost is one afternoon and
  the payoff is durable.
- Mobile photo upload alt-text editor — the iOS VoiceOver reading order is
  fragile. We may need to switch the layout so the alt-text editor is
  rendered **above** the thumbnail rather than below, which solves the
  reading-order issue without `accessibilityElementsHidden` gymnastics.
- Dynamic type at the largest Accessibility sizes — the constituency picker
  drawer becomes nearly unusable. Either (a) cap font-scale on this one
  component with a justification, or (b) redesign the drawer as a full-screen
  modal at high font-scales. **Recommendation:** (b), but defer to Phase 5.
