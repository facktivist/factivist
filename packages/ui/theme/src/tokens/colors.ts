/**
 * Primitive color scales — oklch.
 *
 * Mirrors the CSS-first tokens defined in
 * `tooling/tailwind-config/index.css`. This file is the TypeScript-typed
 * view of the same source-of-truth values: use it in JS/RN contexts where
 * CSS custom properties are not available (React Native, server-rendered
 * email, design-token export, etc.).
 *
 * Conventions
 *   - 11 steps per scale: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
 *   - Perceptually-uniform lightness ladder
 *   - Chroma damped at the L extremes to stay inside the sRGB gamut
 *   - All values are valid `oklch(L C H)` strings (no alpha channel here;
 *     overlays are composed at the surface level, not the token level)
 *
 * Brand hue rationale: `oklch(0.55 0.20 250)` — saturated indigo-blue.
 * Hue 250 is WCAG-friendly on both light and dark surfaces, chroma 0.20
 * stays in gamut at L=0.55, and it pairs cleanly with hue-tilted neutrals.
 *
 * Maintenance contract:
 *   - The CSS at `tooling/tailwind-config/index.css` is the canonical
 *     source. This file mirrors it byte-for-byte at the L/C/H values
 *     (typography of `0.5` vs `0.50` is normalised). If you change one,
 *     change the other in the same commit.
 *   - The Claude Design handoff CSS at
 *     `docs/design/s1/handoff/design-system/hero-design-system/project/colors_and_type.css`
 *     also mirrors these values. Update it too on any change.
 */

/** The eleven lightness/chroma steps every scale must define. */
export type ColorStep =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | '950'

/** A complete color scale: every {@link ColorStep} maps to an oklch string. */
export type ColorScale = Readonly<Record<ColorStep, string>>

/** Neutral gray — slight cool tilt (hue 250) to harmonize with brand. */
export const gray = {
  '50': 'oklch(0.985 0.002 250)',
  '100': 'oklch(0.965 0.004 250)',
  '200': 'oklch(0.925 0.006 250)',
  '300': 'oklch(0.87 0.008 250)',
  '400': 'oklch(0.715 0.012 250)',
  '500': 'oklch(0.56 0.014 250)',
  '600': 'oklch(0.445 0.014 250)',
  '700': 'oklch(0.36 0.012 250)',
  '800': 'oklch(0.27 0.01 250)',
  '900': 'oklch(0.19 0.008 250)',
  '950': 'oklch(0.13 0.006 250)',
} as const satisfies ColorScale

/**
 * Brand / primary — indigo-blue, hue 250.
 *
 * The 500 step is the canonical brand hue (`oklch(0.55 0.20 250)`); do not
 * change its value without updating the CSS preset in lockstep.
 */
export const brand = {
  '50': 'oklch(0.975 0.015 250)',
  '100': 'oklch(0.94 0.04 250)',
  '200': 'oklch(0.88 0.08 250)',
  '300': 'oklch(0.8 0.13 250)',
  '400': 'oklch(0.68 0.18 250)',
  '500': 'oklch(0.55 0.20 250)',
  '600': 'oklch(0.47 0.19 250)',
  '700': 'oklch(0.395 0.17 250)',
  '800': 'oklch(0.32 0.14 250)',
  '900': 'oklch(0.255 0.11 250)',
  '950': 'oklch(0.18 0.075 250)',
} as const satisfies ColorScale

/** Success — green, hue 145. */
export const success = {
  '50': 'oklch(0.975 0.02 145)',
  '100': 'oklch(0.945 0.05 145)',
  '200': 'oklch(0.89 0.09 145)',
  '300': 'oklch(0.815 0.135 145)',
  '400': 'oklch(0.72 0.17 145)',
  '500': 'oklch(0.62 0.185 145)',
  '600': 'oklch(0.515 0.165 145)',
  '700': 'oklch(0.42 0.14 145)',
  '800': 'oklch(0.34 0.115 145)',
  '900': 'oklch(0.275 0.09 145)',
  '950': 'oklch(0.19 0.06 145)',
} as const satisfies ColorScale

/** Warning — amber, hue 75. */
export const warning = {
  '50': 'oklch(0.985 0.02 75)',
  '100': 'oklch(0.96 0.05 75)',
  '200': 'oklch(0.915 0.095 75)',
  '300': 'oklch(0.855 0.14 75)',
  '400': 'oklch(0.79 0.17 75)',
  '500': 'oklch(0.72 0.18 75)',
  '600': 'oklch(0.61 0.165 75)',
  '700': 'oklch(0.495 0.14 75)',
  '800': 'oklch(0.395 0.115 75)',
  '900': 'oklch(0.315 0.09 75)',
  '950': 'oklch(0.215 0.06 75)',
} as const satisfies ColorScale

/** Danger — red, hue 25. */
export const danger = {
  '50': 'oklch(0.975 0.02 25)',
  '100': 'oklch(0.945 0.05 25)',
  '200': 'oklch(0.895 0.095 25)',
  '300': 'oklch(0.825 0.14 25)',
  '400': 'oklch(0.735 0.18 25)',
  '500': 'oklch(0.625 0.215 25)',
  '600': 'oklch(0.53 0.2 25)',
  '700': 'oklch(0.435 0.17 25)',
  '800': 'oklch(0.355 0.14 25)',
  '900': 'oklch(0.285 0.11 25)',
  '950': 'oklch(0.195 0.075 25)',
} as const satisfies ColorScale

/**
 * Info — cyan-blue, hue 220.
 *
 * Distinct from `brand` (hue 250) so info banners read as informational, not
 * primary-actionable. Hue 220 stays inside sRGB at the chroma values below
 * across the full lightness ladder.
 */
export const info = {
  '50': 'oklch(0.97 0.020 220)',
  '100': 'oklch(0.94 0.050 220)',
  '200': 'oklch(0.87 0.090 220)',
  '300': 'oklch(0.78 0.130 220)',
  '400': 'oklch(0.67 0.165 220)',
  '500': 'oklch(0.55 0.180 220)',
  '600': 'oklch(0.45 0.165 220)',
  '700': 'oklch(0.36 0.140 220)',
  '800': 'oklch(0.28 0.115 220)',
  '900': 'oklch(0.21 0.090 220)',
  '950': 'oklch(0.15 0.060 220)',
} as const satisfies ColorScale

/** All primitive color scales keyed by name. */
export const colors = {
  gray,
  brand,
  success,
  warning,
  danger,
  info,
} as const

/** Union of every primitive scale name. */
export type ColorName = keyof typeof colors

/** The eleven steps that every {@link ColorScale} must define. */
export const COLOR_STEPS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const satisfies readonly ColorStep[]
