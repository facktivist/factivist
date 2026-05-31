/**
 * `@factivist/shared` — types, validators, constants.
 *
 * Prefer importing from the dedicated subpaths in app/package code:
 *
 *   import { idSchema } from '@factivist/shared/validators'
 *   import type { Result } from '@factivist/shared/types'
 *   import { APP_NAME } from '@factivist/shared/constants'
 *
 * This barrel exists for convenience and tooling that doesn't resolve subpaths.
 */
export * from './constants/index.ts'
export * from './observability/sentry-scrub.ts'
export * from './types/index.ts'
export * from './validators/index.ts'
