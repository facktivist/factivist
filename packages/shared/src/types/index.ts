/**
 * Shared TypeScript types for Factivist.
 *
 * Branded primitive types live alongside their Zod schemas in
 * `../validators/` — re-exported here for ergonomic consumption.
 */
export type { Email, Id, Slug, Timestamp } from '../validators/primitives.ts'

export * from './identity.ts'
export * from './result.ts'
export * from './utility.ts'
