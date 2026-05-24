/**
 * `@factivist/ui-native` — thin HeroUI Native wrapper layer for Expo.
 *
 * Prefer dedicated subpaths in consumer code:
 *
 *   import { Button, Card } from '@factivist/ui-native/components'
 *   import { useTheme }     from '@factivist/ui-native/hooks'
 *
 * S1 surface compound TYPES (no runtime exports yet — Phase 5 ships JSX)
 * live under feature folders and are re-exported as types only:
 *
 *   import type { OnboardingVerifyStepProps } from '@factivist/ui-native'
 *
 * This barrel exists for convenience and tooling that doesn't resolve subpaths.
 */

// ─── S1 surface compound TYPES (Phase 3 scaffold) ────────────────────
export type * from './comment/index.ts'
export type * from './complaint/index.ts'
export * from './components/index.ts'
export type * from './filter/index.ts'
export * from './hooks/index.ts'
export type * from './legal/index.ts'
export type * from './moderation/index.ts'
export type * from './onboarding/index.ts'
export type * from './profile/index.ts'
export type * from './search/index.ts'
export type * from './shell/index.ts'
