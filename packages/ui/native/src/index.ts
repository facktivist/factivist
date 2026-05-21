/**
 * `@factivist/ui-native` — thin HeroUI Native wrapper layer for Expo.
 *
 * Prefer dedicated subpaths in consumer code:
 *
 *   import { Button, Card } from '@factivist/ui-native/components'
 *   import { useTheme }     from '@factivist/ui-native/hooks'
 *
 * This barrel exists for convenience and tooling that doesn't resolve subpaths.
 */
export * from './components/index.ts'
export * from './hooks/index.ts'
