import { sql } from 'drizzle-orm'
import { customType, index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { categories } from './categories.ts'
import { citizens } from './citizens.ts'
import {
  assemblyConstituencies,
  districts,
  parliamentaryConstituencies,
  states,
} from './constituencies.ts'

/**
 * `complaints` — the only S1 entity that produces public-readable
 * user-generated content. PK is a URL-safe `slug` per [[ADR-012]]
 * (e.g. `pothole-mg-road-7k3a`).
 *
 * ## Anonymity invariants (CRITICAL — [[ADR-010]] + aggregates §2)
 *
 * - **I-COMPL-4** — the row stores `author_id` (text FK to `citizens.id`),
 *   never the raw `nullifier`, IP, user-agent, or session cookie. Public
 *   reads MUST project `author_handle` (derived in code from
 *   `citizens.nullifier` via `@factivist/shared#deriveHandle`).
 * - The route handler (`apps/api/src/routes/complaint.ts`) selects an
 *   explicit column list when responding so a future column addition
 *   forces a deliberate decision at the boundary — mirroring the
 *   convention used by `moderation_queue`.
 *
 * ## Content invariants (aggregates §2 I-COMPL-1..6)
 *
 * - Title ≤ 120 chars, body ≤ 5000 chars — enforced at the Zod boundary
 *   (`createComplaintInputSchema` in `@factivist/shared`).
 * - All four constituency codes (state, district, pc, ac) are required —
 *   the hierarchy is validated against the closed reference tables
 *   ([[ADR-007]] + [[ADR-013]]).
 * - At most 3 photo URLs — enforced at the Zod boundary; each URL points
 *   at a Supabase Storage object whose EXIF was stripped server-side by
 *   `apps/api/src/lib/exif-strip.ts` ([[ADR-004]]).
 * - Disclaimer is a constant (`COMPLAINT_DISCLAIMER`) injected at read
 *   time; we do not store per-row.
 *
 * ## FTS (Postgres-only, per [[ADR-005]] — no Meilisearch)
 *
 * The `searchVector` column is a Postgres `tsvector` populated by a
 * `GENERATED ALWAYS AS` expression at the migration boundary
 * (`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))`).
 * Drizzle Kit handles generated columns via `.generatedAlwaysAs()` —
 * we render the SQL expression with `sql\`...\`` so the migration is
 * deterministic. A GIN index is declared in this file's `extras` block.
 */

/**
 * Lifecycle status. `published` is the only state visible to non-admins
 * (aggregates §2 + ATID-DISC-005). `moderation_pending` is the entry
 * state when the constituency centroid is within 1 km of a sensitive
 * installation (I-COMPL-6).
 */
export const complaintStatusEnum = pgEnum('complaint_status', [
  'draft',
  'published',
  'moderation_pending',
  'removed',
])

/**
 * Postgres `tsvector` custom column. Drizzle has no first-class tsvector
 * support yet; the customType pattern keeps the schema declarative while
 * letting the generated SQL emit a real `tsvector` column. The data is
 * derived (`GENERATED ALWAYS AS`), so we never write to it from TS — it
 * exists in the type for SELECT-shape inference only.
 */
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const complaints = pgTable(
  'complaints',
  {
    /**
     * URL-safe slug per [[ADR-012]]. Format `<short-title>-<base36-suffix>`
     * (e.g. `pothole-mg-road-7k3a`). Globally unique. The route generates
     * the slug from the trimmed title + a short random suffix to keep URLs
     * stable across edits without colliding on common titles.
     */
    slug: text().primaryKey(),
    /**
     * FK to `citizens.id` (text PK, `cit_<uuid>`). Per [[ADR-010]] +
     * aggregates §Citizen I-COMPL-4 this is the ONLY citizen-identifying
     * column on this table. Public reads MUST NOT expose this column;
     * derive `authorHandle` from the joined `citizens.nullifier` at read
     * time and project that instead.
     *
     * `onDelete: 'restrict'` — a citizen with complaints cannot be deleted
     * outside the explicit retire pathway; S1 has no deletion path anyway,
     * so this is a safety net for future migrations.
     */
    authorId: text()
      .notNull()
      .references(() => citizens.id, { onDelete: 'restrict' }),
    /** FK to `categories.slug` — one category per complaint at S1. */
    categorySlug: text()
      .notNull()
      .references(() => categories.slug, { onDelete: 'restrict' }),
    title: text().notNull(),
    body: text().notNull(),
    /**
     * Constituency tuple — ALL four required (aggregates §2 I-COMPL-2).
     * The closed-dataset FKs guarantee the hierarchy validates at insert
     * time; the application layer additionally checks that the AC's PC
     * matches `pcCode` and so on (see the complaint create handler).
     */
    stateCode: text()
      .notNull()
      .references(() => states.code, { onDelete: 'restrict' }),
    districtCode: text()
      .notNull()
      .references(() => districts.code, { onDelete: 'restrict' }),
    pcCode: text()
      .notNull()
      .references(() => parliamentaryConstituencies.code, { onDelete: 'restrict' }),
    acCode: text()
      .notNull()
      .references(() => assemblyConstituencies.code, { onDelete: 'restrict' }),
    /**
     * Post-EXIF-strip photo URLs (≤ 3). Stored as a JSON-encoded string
     * array via Postgres `text[]` — Drizzle's array type. The URLs point
     * to Supabase Storage objects produced by `lib/upload.ts`.
     */
    photoUrls: text().array().notNull().default(sql`'{}'::text[]`),
    status: complaintStatusEnum().notNull().default('published'),
    /**
     * Postgres FTS column (ADR-0005). Populated as a generated column at
     * the migration layer; this declaration carries the type-level shape
     * so the SELECT-builder knows the column exists.
     */
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))`,
    ),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    /**
     * Hot path: `GET /complaints?sort=newest` — the discovery feed orders
     * by `createdAt DESC` filtered by `status='published'`. The composite
     * index keeps the scan O(page size) at S1 volume.
     */
    index('complaints_by_status_created').on(table.status, table.createdAt),
    /** Constituency-narrowed browse (aggregates §discovery). */
    index('complaints_by_state').on(table.stateCode),
    index('complaints_by_district').on(table.districtCode),
    index('complaints_by_pc').on(table.pcCode),
    index('complaints_by_ac').on(table.acCode),
    /** Category filter. */
    index('complaints_by_category').on(table.categorySlug),
    /**
     * GIN index on the FTS column — required for `to_tsquery` to use the
     * index instead of a sequential scan. Migration-level raw SQL because
     * Drizzle Kit does not yet emit `USING gin` from a declarative API.
     */
    index('complaints_search_vector_gin').using('gin', sql`${table.searchVector}`).concurrently(),
  ],
)

export type Complaint = typeof complaints.$inferSelect
export type NewComplaint = typeof complaints.$inferInsert
