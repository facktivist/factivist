import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit configuration for Factivist.
 *
 * - `casing: 'snake_case'` lets us keep TS keys in camelCase while
 *   emitting snake_case columns to Postgres (matches project convention).
 * - For migrations against Supabase, use the DIRECT connection (port 5432),
 *   not the pooled one (6543) — drizzle-kit issues DDL that the pgBouncer
 *   transaction-mode pooler will reject.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
})
