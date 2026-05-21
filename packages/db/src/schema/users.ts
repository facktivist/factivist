import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

import { createId } from './_helpers.ts'

/**
 * `users` — first-class identity record for Factivist accounts.
 *
 * Convention notes:
 *   - Plural snake_case table name.
 *   - Prefixed text PK (`usr_<uuid>`) — Stripe-style.
 *   - Column keys are camelCase in TS; Drizzle emits snake_case in SQL
 *     via the `casing: 'snake_case'` setting in `drizzle.config.ts`.
 *   - `emailVerifiedAt` is nullable: a user exists before they verify.
 *   - `updatedAt` auto-bumps on every UPDATE via `$onUpdate`.
 */
export const users = pgTable(
  'users',
  {
    id: text().primaryKey().$defaultFn(createId('usr')),
    email: text().notNull(),
    displayName: text().notNull(),
    avatarUrl: text(),
    emailVerifiedAt: timestamp({ withTimezone: true, mode: 'date' }),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
