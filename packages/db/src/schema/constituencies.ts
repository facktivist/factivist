import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Closed-dataset constituency reference tables (read-only at runtime).
 *
 * Source layers per the `s1-constituency-source` memory + Phase 1 research
 * wiki "Research-Constituency-Dataset":
 *   - **Authoritative text** (codes, names, AC↔PC mapping): ECI 2008
 *     Delimitation Order + J&K 2022 supplement.
 *   - **Geometry** (server-side reverse-geocode at S2+): DataMeet shapefiles
 *     (CC BY 4.0 / CC BY-SA 2.5 IN). NOT stored here — handled by the geo
 *     pipeline; this module owns the text/identifier layer only.
 *
 * Per [[ADR-007]] (closed dataset) + [[ADR-013]] (manual geo) the runtime
 * never writes to these tables; seed data lives under
 * `packages/db/src/seed/constituencies/`. All four tables use stable
 * composite-string PKs so 2026+ re-delimitation does not renumber any
 * historical complaint's stored constituency tuple.
 *
 * Public route surface (`apps/api/src/routes/constituency.ts`):
 *   - `GET /constituency/:level?parent=…`  list one level (combobox feed)
 *   - `GET /constituency/search?q=…`       fuzzy search across all levels
 *
 * The `apps/web` and `apps/mobile` clients drive a four-cascade combobox
 * (ADR-017) that submits the resolved `(state, district, pc, ac)` quad
 * with every complaint — see `aggregates.md` §Complaint I-COMPL-2.
 */

/**
 * 37 rows — 28 states + 8 union territories + 1 sentinel `XX` for legacy
 * imports that resolved a complaint to a constituency before the dataset
 * shipped. The sentinel is `removed` at S1 launch and exists only to keep
 * historical FKs valid; new complaints MUST NOT reference it.
 *
 * `code` is the ISO 3166-2:IN suffix (e.g. `KA`, `MH`, `DL`) — same shape
 * the identity-context publicSignals carry, so a citizen's state stays
 * comparable across aggregates without translation.
 */
export const states = pgTable(
  'states',
  {
    /** ISO 3166-2:IN-style 2-letter code, uppercase. e.g. `KA`. */
    code: text().primaryKey(),
    /** Human-readable label, e.g. `Karnataka`. */
    label: text().notNull(),
    /** ECI region grouping (`north`, `south`, etc.) — kept for filters. */
    region: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('states_by_label').on(table.label)],
)

export type State = typeof states.$inferSelect
export type NewState = typeof states.$inferInsert

/**
 * ~785 rows. PK `<state>-<lgd_code>` (e.g. `KA-560` for Bangalore Urban)
 * — the LGD code is the Ministry of Panchayati Raj district code and is
 * stable across re-delimitation. `stateCode` is the FK back to `states`.
 *
 * NOT joined with `parliamentary_constituencies` directly — some districts
 * span multiple PCs and vice versa. See `assemblyConstituencies` for the
 * M:N relationship.
 */
export const districts = pgTable(
  'districts',
  {
    code: text().primaryKey(),
    stateCode: text()
      .notNull()
      .references(() => states.code, { onDelete: 'restrict' }),
    label: text().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('districts_by_state').on(table.stateCode),
    index('districts_by_label').on(table.label),
  ],
)

export type District = typeof districts.$inferSelect
export type NewDistrict = typeof districts.$inferInsert

/**
 * 543 rows (Lok Sabha constituencies). PK `<state>-PC-<pc_number>`
 * (e.g. `KA-PC-26` = Bangalore South). `stateCode` is the FK back to
 * `states`. `districtCode` is **nullable** because some PCs span multiple
 * districts (and the UI uses the PC label, not the district, for those
 * cases) — see the constituency research wiki §3.2.
 */
export const parliamentaryConstituencies = pgTable(
  'parliamentary_constituencies',
  {
    code: text().primaryKey(),
    stateCode: text()
      .notNull()
      .references(() => states.code, { onDelete: 'restrict' }),
    /** Optional anchor district when the PC sits cleanly inside one. */
    districtCode: text().references(() => districts.code, { onDelete: 'set null' }),
    label: text().notNull(),
    /**
     * `'general' | 'sc' | 'st'` — reservation status per the ECI order.
     * Stored as plain text to avoid a pg enum migration footgun (these
     * tables are read-only at runtime; type narrowing happens in Zod).
     */
    reservation: text().notNull().default('general'),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('pcs_by_state').on(table.stateCode),
    index('pcs_by_district').on(table.districtCode),
    index('pcs_by_label').on(table.label),
  ],
)

export type ParliamentaryConstituency = typeof parliamentaryConstituencies.$inferSelect
export type NewParliamentaryConstituency = typeof parliamentaryConstituencies.$inferInsert

/**
 * ~4,123 rows (Vidhan Sabha constituencies). PK `<state>-AC-<ac_number>`.
 * Every AC sits inside exactly one PC; `pcCode` is the FK.
 *
 * NOTE: a small number of ACs span district boundaries — the
 * `assembly_constituency_districts` junction (not shipped at Phase 5,
 * tracked by the geo-research wiki) is the M:N anchor when that matters.
 * For the picker + complaint write path, the AC's primary district is
 * surfaced via `districtCode` (nullable for the same reason as PCs).
 */
export const assemblyConstituencies = pgTable(
  'assembly_constituencies',
  {
    code: text().primaryKey(),
    stateCode: text()
      .notNull()
      .references(() => states.code, { onDelete: 'restrict' }),
    districtCode: text().references(() => districts.code, { onDelete: 'set null' }),
    pcCode: text()
      .notNull()
      .references(() => parliamentaryConstituencies.code, { onDelete: 'restrict' }),
    label: text().notNull(),
    reservation: text().notNull().default('general'),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('acs_by_state').on(table.stateCode),
    index('acs_by_district').on(table.districtCode),
    index('acs_by_pc').on(table.pcCode),
    index('acs_by_label').on(table.label),
  ],
)

export type AssemblyConstituency = typeof assemblyConstituencies.$inferSelect
export type NewAssemblyConstituency = typeof assemblyConstituencies.$inferInsert
