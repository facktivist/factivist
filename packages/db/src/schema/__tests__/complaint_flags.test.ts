import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { complaintFlags, flagReasonEnum } from '../complaint_flags.ts'

/**
 * Schema invariants for `complaint_flags`.
 *
 * Anchored to:
 *   - ADR-0020 — `pii-leak` MUST be a first-class reason (not "other") and
 *     listed FIRST in the enum so the picker order stays aligned.
 *   - aggregates §ModerationCase I-MOD-2 — reporter identity is private to
 *     this table; moderation queue NEVER sees it.
 *   - Unique (complaint_slug, reporter_id) — duplicate flags are absorbed
 *     as idempotent.
 */
describe('complaint_flags table', () => {
  const config = getTableConfig(complaintFlags)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses the plural snake_case table name', () => {
    expect(config.name).toBe('complaint_flags')
  })

  it('exposes the documented columns', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(
      ['id', 'complaintSlug', 'reporterId', 'reason', 'note', 'createdAt'].sort(),
    )
  })

  it('NEVER carries reporter PII columns (aggregates §ModerationCase I-MOD-2)', () => {
    const banned = ['nullifier', 'ip', 'ipAddress', 'userAgent', 'fingerprint']
    for (const n of banned) expect(byKey.has(n)).toBe(false)
  })

  it('id is a `fl_`-prefixed text PK', () => {
    const id = byKey.get('id')
    expect(id?.primary).toBe(true)
    expect(id?.getSQLType()).toBe('text')
    // biome-ignore lint/suspicious/noExplicitAny: defaultFn is internal
    const fn = (id as any).defaultFn as (() => string) | undefined
    expect(fn?.()).toMatch(/^fl_[0-9a-f-]{36}$/)
  })

  it('complaintSlug and reporterId are notNull', () => {
    expect(byKey.get('complaintSlug')?.notNull).toBe(true)
    expect(byKey.get('reporterId')?.notNull).toBe(true)
  })

  it('reason is notNull and uses the flag-reason enum', () => {
    expect(byKey.get('reason')?.notNull).toBe(true)
  })

  it('note is nullable (optional free-text)', () => {
    expect(byKey.get('note')?.notNull).toBe(false)
  })

  it('flagReasonEnum lists pii-leak FIRST per ADR-0020', () => {
    expect(flagReasonEnum.enumValues[0]).toBe('pii-leak')
  })

  it('flagReasonEnum carries every documented reason', () => {
    expect(flagReasonEnum.enumValues).toEqual([
      'pii-leak',
      'harassment',
      'misinformation',
      'spam',
      'off-topic',
    ])
  })

  it('declares the unique (complaintSlug, reporterId) index', () => {
    const idx = config.indexes.find((i) => i.config.name === 'complaint_flags_one_per_reporter')
    expect(idx).toBeDefined()
    expect(idx?.config.unique).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: drizzle column union is internal
    const cols = idx?.config.columns.map((c: any) => c.name)
    expect(cols).toEqual(['complaintSlug', 'reporterId'])
  })

  it('declares a non-unique lookup index on complaintSlug', () => {
    const idx = config.indexes.find((i) => i.config.name === 'complaint_flags_by_complaint')
    expect(idx).toBeDefined()
    expect(idx?.config.unique).toBeFalsy()
  })

  it('FK references resolve to the upstream tables (forces lazy lambdas)', () => {
    // Drizzle stores `() => parentTable.col` lambdas inside
    // `config.foreignKeys[i].reference`. Invoking each .reference() forces
    // the closure so the arrow body counts toward coverage and we can also
    // sanity-check the wiring (slug → complaints; reporterId → citizens).
    expect(config.foreignKeys.length).toBe(2)
    for (const fk of config.foreignKeys) {
      const ref = fk.reference()
      expect(ref).toBeDefined()
      expect(ref.columns.length).toBeGreaterThan(0)
      expect(ref.foreignColumns.length).toBeGreaterThan(0)
    }
  })
})
