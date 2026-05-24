import type { Database } from '@factivist/db/client'
import { type FeatureFlagKey, featureFlags } from '@factivist/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Feature-flag reader.
 *
 * Per `aggregates.md` §FeatureFlag I-FF-3, flag reads are request-scoped:
 * one DB hit per request, not per handler. The route handler memoises the
 * result inside the request context (see `apps/api/src/routes/identity.ts`).
 *
 * Returns `false` for unknown keys — fail-closed is the right answer for a
 * gate that controls whether writes are permitted at all.
 */
export const isFlagEnabled = async (db: Database, key: FeatureFlagKey): Promise<boolean> => {
  const rows = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1)
  return rows[0]?.enabled === true
}
