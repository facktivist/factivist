import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import { createId } from './_helpers.ts'

/**
 * `citizens` — the only row stored per verified Indian citizen.
 *
 * Per [[ADR-010]] (anonymity floor) + `docs/architecture/aggregates.md`
 * §Citizen, this table contains **exactly** the columns below — no name,
 * Aadhaar number, DOB, address, PIN, email, phone, photo bytes, IP, or
 * device fingerprint may be added. Any new column requires a new ADR.
 *
 * - `id` — prefixed text PK (`cit_<uuid>`), Stripe-style; convenient FK
 *   target for `complaints.author_id`, `comments.author_id`, etc., without
 *   ever exposing the raw nullifier to those tables.
 * - `nullifier` — 0x-prefixed 32-byte hex string produced by the
 *   anoncitizen circuit. Globally unique; uniqueness is enforced both
 *   on-chain (CitizenVerifier.nullifierUsed[]) and in this table via a
 *   unique index. A duplicate INSERT MUST surface as a 409 to the caller.
 * - `state_code` / `district_code` — coarse-grained geo (≥ tens of
 *   thousands of people each). The only PII-adjacent fields stored.
 * - `created_at` — server timestamp; clients never set it.
 */
export const citizens = pgTable(
  'citizens',
  {
    id: text().primaryKey().$defaultFn(createId('cit')),
    nullifier: text().notNull(),
    stateCode: text().notNull(),
    districtCode: text().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('citizens_nullifier_unique').on(table.nullifier)],
)

export type Citizen = typeof citizens.$inferSelect
export type NewCitizen = typeof citizens.$inferInsert
