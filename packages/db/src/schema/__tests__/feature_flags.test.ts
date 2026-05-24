/**
 * Schema introspection tests for the `feature_flags` table.
 *
 * Per `docs/architecture/aggregates.md` §FeatureFlag + the Phase 5 identity
 * contract §2, this table is a tiny kill-switch list. S1 ships two keys,
 * both defaulting to `enabled=false`.
 */
import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { FEATURE_FLAG_KEYS, type FeatureFlagKey, featureFlags } from '../feature_flags.ts'

describe('feature_flags table', () => {
  const config = getTableConfig(featureFlags)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses the plural snake_case table name', () => {
    expect(config.name).toBe('feature_flags')
  })

  it('exposes EXACTLY the three contracted columns', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(['enabled', 'key', 'updatedAt'].sort())
  })

  it('every column translates to snake_case at SQL emit time', () => {
    for (const col of config.columns) {
      // biome-ignore lint/suspicious/noExplicitAny: keyAsName is internal
      expect((col as any).keyAsName).toBe(true)
    }
  })

  it('declares `key` as the primary key (text)', () => {
    const k = byKey.get('key')
    expect(k?.primary).toBe(true)
    expect(k?.getSQLType()).toBe('text')
    expect(k?.notNull).toBe(true)
  })

  it('`enabled` is a NOT NULL boolean defaulting to false', () => {
    const e = byKey.get('enabled')
    expect(e?.notNull).toBe(true)
    expect(e?.getSQLType()).toBe('boolean')
    // biome-ignore lint/suspicious/noExplicitAny: hasDefault + default are internal
    expect((e as any).hasDefault).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: default value reflection
    expect((e as any).default).toBe(false)
  })

  it('`updatedAt` is a timestamptz with default + $onUpdate', () => {
    const u = byKey.get('updatedAt')
    expect(u?.notNull).toBe(true)
    expect(u?.getSQLType()).toMatch(/timestamp with time zone/i)
    // biome-ignore lint/suspicious/noExplicitAny: onUpdateFn is internal API
    const onUpdate = (u as any).onUpdateFn as (() => Date) | undefined
    expect(typeof onUpdate).toBe('function')
    const value = onUpdate?.()
    expect(value).toBeInstanceOf(Date)
  })
})

describe('FEATURE_FLAG_KEYS enum', () => {
  it('contains exactly the two S1 keys (order matters for exhaustive switch)', () => {
    expect([...FEATURE_FLAG_KEYS]).toEqual(['S1_PUBLIC_BROWSE', 'S1_COMPLAINT_SUBMIT'])
  })

  it('the inferred type is the union of the literal keys (compile-time)', () => {
    // Exercise the type — assignment proves the union is correct.
    const ok: FeatureFlagKey = 'S1_PUBLIC_BROWSE'
    const ok2: FeatureFlagKey = 'S1_COMPLAINT_SUBMIT'
    expect(ok).toBe('S1_PUBLIC_BROWSE')
    expect(ok2).toBe('S1_COMPLAINT_SUBMIT')
  })
})
