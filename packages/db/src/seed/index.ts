import { createClient } from '../client.ts'
import { users } from '../schema/users.ts'

const SAMPLE_USERS = [
  { email: 'alice@example.com', displayName: 'Alice Anderson' },
  { email: 'bob@example.com', displayName: 'Bob Baxter' },
  { email: 'carol@example.com', displayName: 'Carol Chen' },
] as const

/**
 * Idempotent seed: inserts a handful of demo users, skipping any row whose
 * email already exists. Safe to re-run after migrations or on a fresh DB.
 */
export const seed = async (): Promise<{ inserted: number }> => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL must be set to run the seed script.')
  }

  const database = createClient(url)

  const result = await database
    .insert(users)
    .values([...SAMPLE_USERS])
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id, email: users.email })

  console.log(`Seeded ${result.length} user(s):`)
  for (const row of result) {
    console.log(`  - ${row.id} <${row.email}>`)
  }

  return { inserted: result.length }
}

// Bun-only entrypoint guard. Skipped when imported by tests.
if (import.meta.main) {
  await seed()
}
