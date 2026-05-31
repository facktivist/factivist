import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { categories } from '../categories.ts'

/**
 * Schema invariants for `categories` (35-row read-only taxonomy at S1).
 *
 * Anchored to:
 *   - ADR-0012 — slug as text PK (URL-safe, stable across re-seeds).
 *   - aggregates §Category — sortOrder drives deterministic picker order.
 */
describe('categories table', () => {
  const config = getTableConfig(categories)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses the plural snake_case table name', () => {
    expect(config.name).toBe('categories')
  })

  it('exposes only the documented columns', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(['slug', 'label', 'sortOrder', 'createdAt'].sort())
  })

  it('slug is the text primary key (ADR-0012)', () => {
    const slug = byKey.get('slug')
    expect(slug?.primary).toBe(true)
    expect(slug?.getSQLType()).toBe('text')
  })

  it('label is NOT NULL', () => {
    expect(byKey.get('label')?.notNull).toBe(true)
  })

  it('sortOrder is NOT NULL with default "999"', () => {
    const col = byKey.get('sortOrder')
    expect(col?.notNull).toBe(true)
    expect(col?.hasDefault).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: default value is internal
    expect((col as any).default).toBe('999')
  })

  it('createdAt is timestamp with time zone + defaultNow', () => {
    const col = byKey.get('createdAt')
    expect(col?.dataType).toBe('date')
    expect(col?.getSQLType()).toMatch(/timestamp with time zone/i)
    expect(col?.hasDefault).toBe(true)
  })
})
