/**
 * `@factivist/ui-theme` — framework-agnostic design-token registry.
 *
 * Prefer the dedicated subpaths in app/package code:
 *
 *   import { brand, space, fontSize } from '@factivist/ui-theme/tokens'
 *   import { Themes, lightSemantic } from '@factivist/ui-theme/semantic'
 *
 * This barrel exists for convenience and tooling that doesn't resolve subpaths.
 */

export * from './semantic/index.ts'
export * from './tokens/index.ts'
