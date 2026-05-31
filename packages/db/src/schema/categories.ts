import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * `categories` — read-only complaint-category taxonomy.
 *
 * Per `docs/architecture/aggregates.md` §Category + Phase 1 user decision
 * (AMB-05 merge), S1 ships **exactly 35 rows** at launch. The PK is the
 * slug per [[ADR-012]] (`^[a-z0-9-]+$`).
 *
 * The route handlers `GET /categories` and the complaint create handler
 * both read this table; no run-time writes — seeding happens via a
 * dedicated Drizzle migration that ships with the launch dataset.
 */
export const categories = pgTable('categories', {
  /** URL-safe slug, e.g. `corruption`, `roads`, `health`. Stable across re-seeds. */
  slug: text().primaryKey(),
  /** Human-readable label rendered in pickers + filters. */
  label: text().notNull(),
  /**
   * Sort ordinal — drives the deterministic order in pickers when a
   * locale-aware sort is not desired. Lower comes first.
   */
  sortOrder: text().notNull().default('999'),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
