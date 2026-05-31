import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { complaintStatusEnum, complaints } from '../complaints.ts'

/**
 * Schema invariants for the `complaints` table.
 *
 * Anchored to:
 *   - ADR-0010 (anonymity floor) — only `authorId` FK; NEVER nullifier, IP,
 *     user-agent, or session cookie columns.
 *   - ADR-0012 (slug PK) — primary key is the URL-safe slug.
 *   - ADR-0005 (Postgres FTS) — `search_vector` tsvector generated column
 *     + GIN index for `to_tsquery` planning.
 *   - aggregates §Complaint I-COMPL-2 — all four constituency codes required.
 *   - ATID-COMPL-001 — body ≤5000 chars (enforced at Zod boundary, not here),
 *     four constituency codes + ≤3 photo URLs.
 */
describe('complaints table', () => {
  const config = getTableConfig(complaints)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses the plural snake_case table name', () => {
    expect(config.name).toBe('complaints')
  })

  it('exposes exactly the documented columns — anonymity invariant', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(
      [
        'slug',
        'authorId',
        'categorySlug',
        'title',
        'body',
        'stateCode',
        'districtCode',
        'pcCode',
        'acCode',
        'photoUrls',
        'status',
        // tsvector custom column declared explicitly with SQL name
        // `search_vector` (snake) — every other column uses keyAsName.
        'search_vector',
        'createdAt',
        'updatedAt',
      ].sort(),
    )
  })

  it('NEVER carries the citizen-identifying columns banned by ADR-0010', () => {
    const banned = ['nullifier', 'ip', 'ipAddress', 'userAgent', 'user_agent', 'sessionCookie']
    for (const name of banned) {
      expect(byKey.has(name)).toBe(false)
    }
  })

  it('declares `slug` as the text primary key (ADR-0012)', () => {
    const slug = byKey.get('slug')
    expect(slug?.primary).toBe(true)
    expect(slug?.getSQLType()).toBe('text')
  })

  it('FK columns are notNull (aggregates §2 I-COMPL-2)', () => {
    for (const key of [
      'authorId',
      'categorySlug',
      'title',
      'body',
      'stateCode',
      'districtCode',
      'pcCode',
      'acCode',
    ] as const) {
      expect(byKey.get(key)?.notNull).toBe(true)
    }
  })

  it('photoUrls is a non-null text[] with empty-array default', () => {
    const col = byKey.get('photoUrls')
    expect(col?.notNull).toBe(true)
    expect(col?.hasDefault).toBe(true)
    // text[] in Drizzle reports sql type text[] with array dimensions.
    expect(col?.getSQLType()).toMatch(/text\[\]/)
  })

  it('status uses the complaint_status enum and defaults to "published"', () => {
    const col = byKey.get('status')
    expect(col?.notNull).toBe(true)
    expect(col?.hasDefault).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: default value is internal
    expect((col as any).default).toBe('published')
  })

  it('complaintStatusEnum enumerates draft + published + moderation_pending + removed', () => {
    expect(complaintStatusEnum.enumValues).toEqual([
      'draft',
      'published',
      'moderation_pending',
      'removed',
    ])
  })

  it('search_vector is a generated tsvector column (ADR-0005)', () => {
    const col = byKey.get('search_vector')
    expect(col).toBeDefined()
    expect(col?.getSQLType()).toBe('tsvector')
    // generatedAlwaysAs sets `generated` on the column config.
    // biome-ignore lint/suspicious/noExplicitAny: internal drizzle field
    expect((col as any).generated).toBeDefined()
  })

  it('declares the published-discovery composite index (status, createdAt)', () => {
    const idx = config.indexes.find((i) => i.config.name === 'complaints_by_status_created')
    expect(idx).toBeDefined()
    // biome-ignore lint/suspicious/noExplicitAny: drizzle index column union is internal
    const cols = idx?.config.columns.map((c: any) => c.name)
    expect(cols).toEqual(['status', 'createdAt'])
  })

  it('declares per-constituency-level indexes for narrowed browse', () => {
    const names = config.indexes.map((i) => i.config.name)
    for (const expected of [
      'complaints_by_state',
      'complaints_by_district',
      'complaints_by_pc',
      'complaints_by_ac',
      'complaints_by_category',
    ]) {
      expect(names).toContain(expected)
    }
  })

  it('declares the GIN index on the search vector (ADR-0005 FTS)', () => {
    const idx = config.indexes.find((i) => i.config.name === 'complaints_search_vector_gin')
    expect(idx).toBeDefined()
    // biome-ignore lint/suspicious/noExplicitAny: indexConfig.method is internal
    expect((idx as any)?.config.method).toBe('gin')
  })

  it('createdAt + updatedAt are timestamp with time zone with defaults', () => {
    for (const key of ['createdAt', 'updatedAt'] as const) {
      const col = byKey.get(key)
      expect(col?.dataType).toBe('date')
      expect(col?.getSQLType()).toMatch(/timestamp with time zone/i)
      expect(col?.hasDefault).toBe(true)
    }
  })

  it('updatedAt has an $onUpdate hook that returns a fresh Date', () => {
    const updated = byKey.get('updatedAt')
    // biome-ignore lint/suspicious/noExplicitAny: onUpdateFn is internal API
    const fn = (updated as any).onUpdateFn as (() => Date) | undefined
    expect(typeof fn).toBe('function')
    expect(fn?.()).toBeInstanceOf(Date)
  })

  it('FK references resolve to the upstream tables (forces lazy lambdas)', () => {
    // Six FKs: authorId → citizens, categorySlug → categories,
    // stateCode → states, districtCode → districts, pcCode → pcs, acCode → acs.
    expect(config.foreignKeys.length).toBe(6)
    for (const fk of config.foreignKeys) {
      const ref = fk.reference()
      expect(ref).toBeDefined()
      expect(ref.columns.length).toBeGreaterThan(0)
      expect(ref.foreignColumns.length).toBeGreaterThan(0)
    }
  })
})
