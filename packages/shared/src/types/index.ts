/**
 * Shared TypeScript types for Factivist.
 *
 * Branded primitive types live alongside their Zod schemas in
 * `../validators/` — re-exported here for ergonomic consumption.
 */
export type { Email, Id, Slug, Timestamp } from '../validators/primitives'

export * from './result'
export * from './utility'
