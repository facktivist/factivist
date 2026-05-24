# Factivist S1 — Design Token Lock

> **Phase 3 deliverable** (action plan §3.4). This document IS the design
> system spec. The Claude Design System workspace
> (<https://claude.ai/design/p/0c1a5806-5301-4221-856e-7320a124591b>)
> mirrors it visually — values here are authoritative. Compound contracts
> live in [`heroui-compound-map.md`](./heroui-compound-map.md).

## Why oklch

S1 ships web (Next.js 16 + HeroUI v3 + Tailwind v4) and mobile (Expo +
HeroUI Native + Uniwind) from one token set. oklch wins for three reasons:

1. **Perceptual uniformity.** Lightness steps in oklch read as evenly
   spaced; the same `L` produces the same perceived brightness across
   hues. Sibling steps in `gray.500` and `brand.500` are interchangeable
   in contrast checks (we still verify with axe-core; this just means
   the math is friendly).
2. **Mobile parity.** React Native 0.85 and Hermes pass `oklch(...)`
   strings through Uniwind unchanged, so a single token bag drives both
   web CSS variables and RN inline styles. No translation layer.
3. **Gamut control.** We damp chroma at the L extremes so every step
   stays inside the sRGB gamut on consumer phones (the failure mode for
   `lab()` and naive `oklch` palettes). See `colors.ts` for the curves.

The brand hue `oklch(0.55 0.20 250)` (saturated indigo-blue) is locked.
Don't tilt the hue without re-rendering the entire surface set in the
Claude Design workspace.

## File layout

```
packages/ui/theme/src/
  tokens/
    colors.ts       primitive scales: gray, brand, success, warning, danger, info (11 steps each)
    space.ts        4px grid: 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
    radius.ts       none, sm (4), md (8), lg (12), xl (16), full (9999)
    typography.ts   fontSize (xs..4xl), lineHeight (paired), fontWeight (regular..bold)
    shadow.ts       none, light, medium, strong + numeric `elevation` mirror
    motion.ts       duration (fast 100, base 200, slow 300), easing (linear, standard, enter, exit)
  semantic/
    light.ts        role aliases for light mode
    dark.ts         role aliases for dark mode (same key set as light)
```

The Tailwind preset at `tooling/tailwind-config/index.css` is the
CSS-side mirror of the TS token bag; it MUST be updated in lockstep with
`tokens/colors.ts`. The semantic test suite asserts that light + dark
share the same key set, so adding a role requires a matched pair plus an
update to the canonical vocabulary list in the test.

## Primitive color scales (locked)

Six scales × 11 steps each. Brand hue 250, info hue 220 (deliberately
different so info banners don't read as primary-actionable), success
145 (green), warning 75 (amber), danger 25 (red), neutral gray with a
slight cool tilt on 250.

| Scale | Hue | Canonical step | Use |
|---|---|---|---|
| `gray` | 250 (cool-tilted) | 500 | neutrals, borders, muted text |
| `brand` | 250 | 500 = `oklch(0.55 0.20 250)` | primary actions, links, focus ring |
| `success` | 145 | 500 | confirmations, "verified" states |
| `warning` | 75 | 500 | non-blocking caution (rate-limit notices) |
| `danger` | 25 | 500 | destructive actions, errors, flag CTAs |
| `info` | 220 | 500 | informational banners, ZKP explainer chrome |

Add new primitive scales only when no existing one fits AND a surface
has a recurring need for a distinct hue. New scales MUST register in
`colors.ts` and bump the `colors registry` test assertion.

## Semantic tokens (locked vocabulary)

Both `lightSemantic` and `darkSemantic` export the same 33-key
vocabulary:

**Core surface / text** — `background`, `foreground`, `surface`,
`surfaceElevated`, `text`, `textMuted`, `textOnBrand`

**Card (HeroUI v3 compat)** — `card`, `cardForeground`

**Brand / primary** — `brand`, `brandText`, `primary`,
`primaryForeground`

**Secondary / muted / accent** — `secondary`, `secondaryForeground`,
`muted`, `mutedForeground`, `accent`, `accentForeground`

**Status: danger** — `destructive`, `destructiveForeground`, `dangerBg`,
`dangerText`

**Status: success / warning / info** — `successBg`, `successText`,
`warningBg`, `warningText`, `infoBg`, `infoText`

**Borders / inputs / focus ring** — `border`, `borderStrong`, `input`,
`ring`

Compounds consume semantic roles only. No primitive scale references in
component code.

## Spacing — 4px grid

```
0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
```

`2` and `6` are the only sub-grid values (hairline borders, tight icon
padding). Everything else is a multiple of 4. Web consumers use the
Tailwind `--spacing-*` utilities; native consumers use the JS object
from `@factivist/ui-theme/tokens`.

## Radii

`none (0)`, `sm (4)`, `md (8)`, `lg (12)`, `xl (16)`, `full (9999)`.
Default for cards and buttons is `md`; chips and pills use `full`.

## Type ramp

| Token | px | Use |
|---|---|---|
| `xs` | 12 | captions, meta, tiny labels |
| `sm` | 14 | secondary copy, helper text |
| `base` | 16 | body (browser default) |
| `md` | 18 | emphasised body |
| `lg` | 20 | small headings, card titles |
| `xl` | 24 | section headings |
| `2xl` | 30 | page headings |
| `3xl` | 36 | hero (rare in S1) |
| `4xl` | 48 | hero (legal `Page` masthead) |

Line heights are paired one-for-one with `fontSize` keys; weights are
`regular (400)`, `medium (500)`, `semibold (600)`, `bold (700)`.

## Shadows / elevation

| Tier | Use |
|---|---|
| `none` | resets / opt-out |
| `light` | cards, list rows, photo tiles |
| `medium` | sticky bars (`Complaint.SubmitBar`, `Shell.TabBar`) |
| `strong` | modals, dialogs, photo lightbox |

`elevation` exposes numeric tiers (0, 1, 4, 12) for the RN `elevation`
prop on Android. CSS `box-shadow` strings live in the same `shadow.ts`.

## Motion

Durations `fast (100ms)`, `base (200ms)`, `slow (300ms)`. Easings:

| Easing | Curve | Use |
|---|---|---|
| `linear` | `linear` | progress bars only |
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | default for affordances |
| `enter` | `cubic-bezier(0, 0, 0.2, 1)` | element entering screen |
| `exit` | `cubic-bezier(0.4, 0, 1, 1)` | element leaving screen |

Mobile consumers translate to Reanimated `Easing.bezier(...)`.
Durations stay the same across platforms.

## Light / dark mechanics

- **Web.** Toggle via `class="dark"` on `<html>`. The Tailwind preset
  re-points `--color-*` semantic vars in the `.dark` block. Components
  read semantic vars only.
- **Mobile.** `Themes.light` / `Themes.dark` from
  `@factivist/ui-theme/semantic` are runtime-selected and threaded
  through a context provider in `packages/ui/native/hooks/useTheme.ts`
  (already shipped in S0).
- **System default.** Both platforms fall back to
  `prefers-color-scheme` when the user hasn't toggled explicitly.

## How to add a new token

1. **Primitive.** Add the scale to `packages/ui/theme/src/tokens/colors.ts`,
   register it in the `colors` const, and update the matching test in
   `tokens/__tests__/colors.test.ts`. Mirror the values into
   `tooling/tailwind-config/index.css`.
2. **Semantic.** Add the role to BOTH `semantic/light.ts` and
   `semantic/dark.ts` (the suite asserts key-set equality), then update
   the canonical vocabulary list in
   `semantic/__tests__/semantic.test.ts`. The value MUST be an alias
   over a primitive scale or another semantic role — never a literal
   oklch string in the semantic file.
3. **Spacing / radius / typography / shadow / motion.** Add the entry
   to the relevant `tokens/*.ts` file, then ensure the existing test
   invariants still hold (e.g. `space` is 4-grid-aligned outside of the
   `0.5/1.5` sub-grid steps; `radius` is monotonically increasing
   excluding `full`).
4. **Compound surface map.** If the new token serves a specific
   compound, update that surface's row in
   [`heroui-compound-map.md`](./heroui-compound-map.md).

## Verification

```bash
# Type-check + token tests
bun run --filter @factivist/ui-theme test

# Full repo check (lint → test:coverage → build) before merging
bun run check
```

Coverage thresholds (project-wide): lines ≥ 95%, functions ≥ 95%,
statements ≥ 95%, branches ≥ 90%.

## Cross-link

- Claude Design System workspace (visual mirror):
  <https://claude.ai/design/p/0c1a5806-5301-4221-856e-7320a124591b>
- Compound contract: [`heroui-compound-map.md`](./heroui-compound-map.md)
- ADR-010 (anonymity floor): `docs/adr/0010-*.md` (Phase 4)
- ADR-013 (manual geo picker): `docs/adr/0013-*.md` (Phase 4)
