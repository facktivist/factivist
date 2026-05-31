/**
 * Motion tokens — durations and easing curves.
 *
 * Three durations:
 *   - `fast`    100ms  micro-interactions (button press, hover)
 *   - `base`    200ms  default for most affordances (modal open, drawer)
 *   - `slow`    300ms  large-surface transitions (route change, sheet)
 *
 * Eases follow the conventional set:
 *   - `linear`     no curve (progress bars only)
 *   - `standard`   gentle ease-in-out, most affordances
 *   - `enter`      decelerate, for things appearing on screen
 *   - `exit`       accelerate, for things leaving the screen
 *
 * Values are CSS-shape (`Xms`, `cubic-bezier(...)`) so they drop in directly
 * to `transition` / `animation` / Framer Motion. Mobile consumers should
 * translate to Reanimated `Easing.bezier(...)` — durations stay the same.
 */

export const duration = {
  fast: '100ms',
  base: '200ms',
  slow: '300ms',
} as const

export type DurationKey = keyof typeof duration
export type DurationValue = (typeof duration)[DurationKey]

export const easing = {
  linear: 'linear',
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  enter: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0.0, 1, 1)',
} as const

export type EasingKey = keyof typeof easing
export type EasingValue = (typeof easing)[EasingKey]

/** Bundled motion token group. */
export const motion = {
  duration,
  easing,
} as const
