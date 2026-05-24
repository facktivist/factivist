import { createClient } from '../client.ts'
import { FEATURE_FLAG_KEYS, featureFlags } from '../schema/feature_flags.ts'

/**
 * Idempotent feature-flag seed: inserts the S1 flag set with `enabled=false`,
 * skipping any row whose key already exists. Safe to re-run.
 *
 * S1 ships with all flags off; the admin surface flips them at launch time.
 */
export const seedFeatureFlags = async (): Promise<{ inserted: number }> => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL must be set to run the feature-flag seed.')
  }

  const database = createClient(url)

  const rows = FEATURE_FLAG_KEYS.map((key) => ({ key, enabled: false }))

  const result = await database
    .insert(featureFlags)
    .values(rows)
    .onConflictDoNothing({ target: featureFlags.key })
    .returning({ key: featureFlags.key })

  return { inserted: result.length }
}

if (import.meta.main) {
  const { inserted } = await seedFeatureFlags()
  console.log(`Seeded ${inserted} feature flag(s).`)
}
