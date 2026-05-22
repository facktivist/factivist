/**
 * `migration-port` — refuse to run migrations against Supabase's pooled
 * endpoint (port 6543). pgBouncer in transaction mode rejects the DDL
 * drizzle-kit emits, so this catches a real, recurring foot-gun rather than
 * a hypothetical one.
 *
 * Accepts `local` bypass — local Postgres on a non-standard port is fine.
 * It does not accept `hotfix`: production migrations should never be
 * run through the pooled endpoint regardless of urgency.
 */

import type { Guardrail, Verdict } from '../types.ts'

const POOLED_PORT = '6543'

const containsPort = (url: string, port: string): boolean => {
  // Match `:6543` followed by a path, query, slash, or end-of-string. This
  // avoids false positives on passwords or query params that happen to
  // contain "6543".
  return new RegExp(`:${port}(/|\\?|$)`).test(url)
}

export const migrationPort: Guardrail = {
  name: 'migration-port',
  description: 'Refuse to run migrations against the pooled (port 6543) Supabase endpoint.',
  acceptsBypass: ['local', 'sudo'],
  run: async (ctx): Promise<Verdict> => {
    const url = ctx.env.DATABASE_URL
    if (!url) {
      return {
        ok: false,
        reason: 'DATABASE_URL is unset; cannot validate migration target',
      }
    }
    if (containsPort(url, POOLED_PORT)) {
      return {
        ok: false,
        reason: 'DATABASE_URL targets the Supabase pooled endpoint (6543)',
        details: [
          'Use the DIRECT connection (port 5432) for migrations.',
          'pgBouncer in transaction mode rejects DDL and prepared statements.',
        ],
      }
    }
    return { ok: true }
  },
}
