/**
 * Row-level security coverage test (Phase 9 §E1).
 *
 * Reads `packages/db/drizzle/0004_enable_rls.sql` +
 * `packages/db/drizzle/0005_dpdp_grievance_contacts.sql` as the SQL
 * source of truth (they are hand-written; drizzle-kit does not emit
 * `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` from the TypeScript
 * schema as of 0.45.x). Asserts:
 *
 *   1. Every table defined in `packages/db/src/schema/*.ts` has a
 *      matching `ENABLE ROW LEVEL SECURITY` statement in one of the
 *      RLS migrations.
 *   2. Every citizen-PII table is in the "default-deny, no anon policy"
 *      set documented in 0004 (citizens, users, audit_log,
 *      complaint_flags, moderation_queue, feature_flags,
 *      dev_metrics.*, grievance_contacts).
 *   3. Public reference data has at least one `anon SELECT` policy
 *      (states, districts, parliamentary_constituencies,
 *      assembly_constituencies, categories).
 *   4. `complaints` has an anon SELECT policy gated on
 *      `status = 'published'` (the public feed predicate).
 *
 * This test fails closed: if a future migration adds a new citizen-
 * touching table without flipping RLS on, the suite stays red until
 * the SQL migration follows. The historical RLS-was-off H-finding
 * documented in [[s1-phase-5-done]] post-hoc correction cannot
 * recur silently.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))
// src/__tests__ → src → db
const dbRoot = resolve(dir, '..', '..')

const readMigration = (name: string): string =>
  readFileSync(resolve(dbRoot, 'drizzle', name), 'utf8')

const sqlEnableRlsMigrations = [
  '0004_enable_rls.sql',
  '0005_dpdp_grievance_contacts.sql',
  '0006_comments_table.sql',
]

const combinedSql = sqlEnableRlsMigrations.map((name) => readMigration(name)).join('\n')

const stripDoubleQuotes = (s: string): string => s.replaceAll('"', '')

/**
 * Crude SQL identifier parser — extracts table names from
 * `ALTER TABLE [<schema>.]<name> ENABLE ROW LEVEL SECURITY` lines.
 *
 * Returns `<schema>.<name>` for cross-schema tables (e.g.
 * `dev_metrics.llm_calls`), bare `<name>` for the public schema.
 */
const collectEnabledTables = (sql: string): ReadonlyArray<string> => {
  const tables: string[] = []
  const re = /ALTER\s+TABLE\s+([^\s]+(?:\.[^\s]+)?)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi
  for (const m of sql.matchAll(re)) {
    const ident = stripDoubleQuotes(m[1] ?? '')
    if (ident.length > 0) tables.push(ident)
  }
  return tables
}

/**
 * Walk the Drizzle schema files and pull every `pgTable('name', ...)`
 * call. Cross-schema tables (`devMetricsSchema.table('foo', ...)`) are
 * detected separately and prefixed.
 */
const collectDrizzleTables = (): ReadonlyArray<string> => {
  const schemaDir = resolve(dbRoot, 'src', 'schema')
  const files = readdirSync(schemaDir).filter(
    (f) => f.endsWith('.ts') && !f.startsWith('_') && f !== 'index.ts',
  )
  const tables: string[] = []
  const tableRe = /\bpgTable\s*\(\s*['"]([a-z_][a-z0-9_]*)['"]/gi
  const schemaTableRe = /\.table\s*\(\s*['"]([a-z_][a-z0-9_]*)['"]/gi
  for (const f of files) {
    const text = readFileSync(resolve(schemaDir, f), 'utf8')
    for (const m of text.matchAll(tableRe)) tables.push(m[1] ?? '')
    // dev_metrics tables live under devMetricsSchema.table(...)
    if (text.includes('devMetricsSchema')) {
      for (const m of text.matchAll(schemaTableRe)) {
        if ((m[1] ?? '').length > 0) tables.push(`dev_metrics.${m[1]}`)
      }
    }
  }
  return tables.filter((t) => t.length > 0)
}

const ENABLED_TABLES = new Set(collectEnabledTables(combinedSql))
const DRIZZLE_TABLES = collectDrizzleTables()

/** Tables that MUST have NO anon policy in the RLS migration. */
const DEFAULT_DENY_TABLES = [
  'citizens',
  'users',
  'audit_log',
  'complaint_flags',
  'moderation_queue',
  'feature_flags',
  'grievance_contacts',
  'dev_metrics.llm_calls',
  'dev_metrics.zkp_route_events',
] as const

/** Tables that MUST expose an anon SELECT policy (reference data). */
const ANON_READABLE_TABLES = [
  'states',
  'districts',
  'parliamentary_constituencies',
  'assembly_constituencies',
  'categories',
] as const

const hasPolicyOn = (sql: string, table: string, role: string): boolean => {
  // CREATE POLICY "name" ON "table" FOR SELECT TO anon ...
  const tableLit = `"${table}"`
  const idx = sql.indexOf(tableLit)
  if (idx === -1) return false
  // crude: every CREATE POLICY ON "table" ... TO <role> should match.
  const re = new RegExp(
    `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+"${table.replace(/[.]/g, '\\.')}"[^;]*\\bTO\\s+${role}\\b`,
    'i',
  )
  return re.test(sql)
}

describe('RLS coverage — every Drizzle table has ENABLE ROW LEVEL SECURITY', () => {
  it.each(DRIZZLE_TABLES.map((t) => [t]))('table %s is RLS-enabled in 0004 or 0005', (table) => {
    expect(
      ENABLED_TABLES.has(table),
      `Drizzle table "${table}" has no \`ALTER TABLE ... ENABLE ROW LEVEL SECURITY\` line in any of: ${sqlEnableRlsMigrations.join(', ')}. Add one, or fold the new table into the Phase 9 §3 follow-up migration.`,
    ).toBe(true)
  })

  it('enables RLS on at least the 14 baseline tables', () => {
    expect(ENABLED_TABLES.size).toBeGreaterThanOrEqual(14)
  })
})

describe('Default-deny posture — citizen-PII tables have NO anon policy', () => {
  it.each(DEFAULT_DENY_TABLES.map((t) => [t]))('table %s has no anon-role policy', (table) => {
    expect(
      hasPolicyOn(combinedSql, table, 'anon'),
      `Table "${table}" is in the default-deny set but a CREATE POLICY ... TO anon exists in the migration. Citizen-PII tables must rely on default-deny.`,
    ).toBe(false)
  })
})

describe('Public reference tables expose an anon SELECT policy', () => {
  it.each(
    ANON_READABLE_TABLES.map((t) => [t]),
  )('table %s has at least one anon-role policy', (table) => {
    expect(
      hasPolicyOn(combinedSql, table, 'anon'),
      `Reference table "${table}" needs a CREATE POLICY ... FOR SELECT TO anon — otherwise the public feed/composer can't read it without going through apps/api.`,
    ).toBe(true)
  })
})

describe('complaints — anon SELECT is predicated on status=published', () => {
  it('has the public-feed predicate', () => {
    const re =
      /CREATE\s+POLICY\s+"[^"]+"\s+ON\s+"complaints"[^;]*FOR\s+SELECT\s+TO\s+anon[^;]*status\s*=\s*'published'/i
    expect(re.test(combinedSql)).toBe(true)
  })
})

describe('comments — anon SELECT requires parent published + comment unflagged', () => {
  it('has the conditional SELECT policy', () => {
    // The predicate is multi-clause (flagged_state = 'ok' AND EXISTS …).
    // We assert the two key fragments separately + the role.
    const policyRe = /CREATE\s+POLICY\s+"[^"]+"\s+ON\s+"comments"[^;]*FOR\s+SELECT\s+TO\s+anon/i
    expect(policyRe.test(combinedSql)).toBe(true)
    // The flagged-state guard is required so flagged content can't
    // leak via anon.
    expect(/flagged_state\s*=\s*'ok'/i.test(combinedSql)).toBe(true)
    // The parent-published guard prevents anon reads on draft/deleted
    // complaints' comment threads.
    expect(/c\.status\s*=\s*'published'/i.test(combinedSql)).toBe(true)
  })

  it('has no anon INSERT / UPDATE / DELETE policies', () => {
    const writeRe =
      /CREATE\s+POLICY\s+"[^"]+"\s+ON\s+"comments"[^;]*FOR\s+(INSERT|UPDATE|DELETE)[^;]*TO\s+anon/i
    expect(writeRe.test(combinedSql)).toBe(false)
  })
})
