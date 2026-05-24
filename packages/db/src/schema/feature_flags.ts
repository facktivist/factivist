import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * `feature_flags` — kill-switch flags consulted on every write path.
 *
 * Per `docs/architecture/aggregates.md` §FeatureFlag + C4 §C-5, the two S1
 * flags are `S1_PUBLIC_BROWSE` and `S1_COMPLAINT_SUBMIT`. Both seed `false`
 * — production unlocks via an admin action.
 *
 * The full admin write surface (with audit-log + Supabase JWT) lands in a
 * later Phase 5 wave. This module ships the table + types so identity
 * routes can consult flags via `apps/api/src/lib/flags.ts`.
 */
export const featureFlags = pgTable('feature_flags', {
  key: text().primaryKey(),
  enabled: boolean().notNull().default(false),
  updatedAt: timestamp({ withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type FeatureFlag = typeof featureFlags.$inferSelect
export type NewFeatureFlag = typeof featureFlags.$inferInsert

/** S1 flag keys — kept narrow so callers get exhaustive switch checks. */
export const FEATURE_FLAG_KEYS = ['S1_PUBLIC_BROWSE', 'S1_COMPLAINT_SUBMIT'] as const
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number]
