/**
 * Elevation / box-shadow tokens.
 *
 * Three tiers — `light`, `medium`, `strong` — chosen for the S1 surfaces:
 *   - `light`    cards, list rows, photo tiles
 *   - `medium`   sticky bars (composer submit bar, mobile tab bar)
 *   - `strong`   modals, dialogs, photo lightbox
 *
 * Values are CSS `box-shadow` strings using a layered approach (ambient +
 * directional) for perceptual depth that holds up on both light and dark
 * surfaces. Mobile consumers (Uniwind) can pick the closest RN shadow API
 * approximation; see `docs/design/s1/token-lock.md` for the mapping.
 *
 * The `none` sentinel is `0 0 #0000` so consumers can opt out of elevation
 * without branching.
 */

export const shadow = {
  none: '0 0 #0000',
  light: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
  medium: '0 2px 4px -1px rgb(0 0 0 / 0.06), 0 4px 8px -2px rgb(0 0 0 / 0.08)',
  strong: '0 8px 16px -4px rgb(0 0 0 / 0.10), 0 16px 32px -8px rgb(0 0 0 / 0.14)',
} as const

export type ShadowKey = keyof typeof shadow
export type ShadowValue = (typeof shadow)[ShadowKey]

/**
 * Numeric elevation tiers, suitable for React Native `elevation` prop on
 * Android. Web consumers should prefer the CSS box-shadow strings in
 * {@link shadow}. The keys mirror {@link shadow} so consumers can pick the
 * matching tier without a translation table.
 */
export const elevation = {
  none: 0,
  light: 1,
  medium: 4,
  strong: 12,
} as const

export type ElevationKey = keyof typeof elevation
export type ElevationValue = (typeof elevation)[ElevationKey]
