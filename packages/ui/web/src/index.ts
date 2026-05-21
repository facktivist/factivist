/**
 * `@factivist/ui-web` — thin HeroUI v3 wrapper layer for Next.js.
 *
 * Prefer dedicated subpaths in consumer code:
 *
 *   import { Button, Card } from '@factivist/ui-web/components'
 *   import { useTheme }     from '@factivist/ui-web/hooks'
 *
 * This barrel exists for convenience and tooling that doesn't resolve subpaths.
 */
export * from './components/index.ts'
export * from './hooks/index.ts'
