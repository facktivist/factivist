/**
 * Border-radius scale.
 *
 * Values are pixel integers. `full` is the pill/circle sentinel (9999).
 * The named steps are monotonically increasing from `none` → `xl`; only
 * `full` breaks the ordering by design.
 */
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const

export type RadiusKey = keyof typeof radius
export type RadiusValue = (typeof radius)[RadiusKey]
