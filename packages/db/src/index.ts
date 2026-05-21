/**
 * `@factivist/db` — Drizzle ORM + Supabase Postgres.
 *
 * Prefer subpath imports in app/package code:
 *
 *   import { users } from '@factivist/db/schema';
 *   import { createClient } from '@factivist/db/client';
 *   import type { User } from '@factivist/db/types';
 *
 * This barrel exists for convenience and tooling that doesn't resolve subpaths.
 */

export { createClient, type Database, db } from './client.ts'
export * from './schema/index.ts'
export type { NewUser, User } from './types.ts'
