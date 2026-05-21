/**
 * Spacing scale — 4px base grid.
 *
 * Values are stored as `number` (raw pixels) so JS/RN consumers can do math
 * directly. Web consumers should prefer the Tailwind `--spacing-*` utilities
 * driven by the CSS preset and treat this object as a reference table.
 *
 * The `0.5` (2px) and `1.5` (6px) steps are sub-grid values, kept for
 * hairline borders and tight icon padding. All other steps are exact
 * multiples of 4.
 */
export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const

export type SpaceKey = keyof typeof space
export type SpaceValue = (typeof space)[SpaceKey]
