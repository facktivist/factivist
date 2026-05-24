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
  '50': 'oklch(0.97 0.002 250)',
  '100': 'oklch(0.94 0.004 250)',
  '200': 'oklch(0.87 0.006 250)',
  '300': 'oklch(0.78 0.008 250)',
  '400': 'oklch(0.67 0.012 250)',
  '500': 'oklch(0.55 0.014 250)',
  '600': 'oklch(0.45 0.014 250)',
  '700': 'oklch(0.36 0.012 250)',
  '800': 'oklch(0.28 0.010 250)',
  '900': 'oklch(0.21 0.008 250)',
  '950': 'oklch(0.15 0.006 250)',
} as const satisfies ColorScale

/**
 * Brand / primary — indigo-blue, hue 250.
 *
 * The 500 step is the canonical brand hue (`oklch(0.55 0.20 250)`); do not
 * change its value without updating the CSS preset in lockstep.
 */
export const brand = {
  '50': 'oklch(0.97 0.015 250)',
  '100': 'oklch(0.94 0.040 250)',
  '200': 'oklch(0.87 0.080 250)',
  '300': 'oklch(0.78 0.130 250)',
  '400': 'oklch(0.67 0.180 250)',
  '500': 'oklch(0.55 0.20 250)',
  '600': 'oklch(0.45 0.190 250)',
  '700': 'oklch(0.36 0.170 250)',
  '800': 'oklch(0.28 0.140 250)',
  '900': 'oklch(0.21 0.110 250)',
  '950': 'oklch(0.15 0.075 250)',
} as const satisfies ColorScale

/** Success — green, hue 145. */
export const success = {
  '50': 'oklch(0.97 0.020 145)',
  '100': 'oklch(0.94 0.050 145)',
  '200': 'oklch(0.87 0.090 145)',
  '300': 'oklch(0.78 0.135 145)',
  '400': 'oklch(0.67 0.170 145)',
  '500': 'oklch(0.55 0.185 145)',
  '600': 'oklch(0.45 0.165 145)',
  '700': 'oklch(0.36 0.140 145)',
  '800': 'oklch(0.28 0.115 145)',
  '900': 'oklch(0.21 0.090 145)',
  '950': 'oklch(0.15 0.060 145)',
} as const satisfies ColorScale

/** Warning — amber, hue 75. */
export const warning = {
  '50': 'oklch(0.97 0.020 75)',
  '100': 'oklch(0.94 0.050 75)',
  '200': 'oklch(0.87 0.095 75)',
  '300': 'oklch(0.78 0.140 75)',
  '400': 'oklch(0.67 0.170 75)',
  '500': 'oklch(0.55 0.180 75)',
  '600': 'oklch(0.45 0.165 75)',
  '700': 'oklch(0.36 0.140 75)',
  '800': 'oklch(0.28 0.115 75)',
  '900': 'oklch(0.21 0.090 75)',
  '950': 'oklch(0.15 0.060 75)',
} as const satisfies ColorScale

/** Danger — red, hue 25. */
export const danger = {
  '50': 'oklch(0.97 0.020 25)',
  '100': 'oklch(0.94 0.050 25)',
  '200': 'oklch(0.87 0.095 25)',
  '300': 'oklch(0.78 0.140 25)',
  '400': 'oklch(0.67 0.180 25)',
  '500': 'oklch(0.55 0.215 25)',
  '600': 'oklch(0.45 0.200 25)',
  '700': 'oklch(0.36 0.170 25)',
  '800': 'oklch(0.28 0.140 25)',
  '900': 'oklch(0.21 0.110 25)',
  '950': 'oklch(0.15 0.075 25)',
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
