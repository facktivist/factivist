/**
 * Typography tokens — modular type scale, line heights, and font weights.
 *
 * Sizes follow a 1.2-ish modular scale, snapped to whole pixels for crisp
 * rendering. Line heights are paired sensibly: tight (~1.25) for headings
 * and relaxed (~1.5) for body text.
 */

/** Font sizes (px). */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 48,
} as const

export type FontSizeKey = keyof typeof fontSize

/** Line heights (unitless multipliers). Pair with {@link fontSize} by key. */
export const lineHeight = {
  xs: 1.5,
  sm: 1.5,
  base: 1.5,
  md: 1.5,
  lg: 1.4,
  xl: 1.35,
  '2xl': 1.3,
  '3xl': 1.25,
  '4xl': 1.15,
} as const

export type LineHeightKey = keyof typeof lineHeight

/** Font weights — covers regular, medium, semibold, bold. */
export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const

export type FontWeightKey = keyof typeof fontWeight

/** Bundled typography token group. */
export const typography = {
  fontSize,
  lineHeight,
  fontWeight,
} as const
