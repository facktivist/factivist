/**
 * Shared TypeScript types for Factivist.
 *
 * Branded primitive types live alongside their Zod schemas in
 * `../validators/` — re-exported here for ergonomic consumption.
 */
export type { Email, Id, Pagination, Slug, Timestamp } from '../validators/primitives.ts';
export type { PaginationInput } from '../validators/pagination.ts';

export * from './result.ts';
export * from './utility.ts';
