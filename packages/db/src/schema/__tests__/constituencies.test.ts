import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import {
  assemblyConstituencies,
  districts,
  parliamentaryConstituencies,
  states,
} from '../constituencies.ts'

/**
 * Schema invariants for the four-table closed constituency dataset.
 *
 * Anchored to:
 *   - ADR-0007 — closed dataset, runtime never writes.
 *   - ADR-0013 — manual geo tagging only (no GPS column).
 *   - aggregates §Constituency — text PKs are stable across 2026+
 *     re-delimitation so historical complaint FKs never break.
 */
describe('states table', () => {
  const config = getTableConfig(states)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses singular SQL table name "states"', () => {
    expect(config.name).toBe('states')
  })

  it('exposes only the documented columns', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(['code', 'label', 'region', 'createdAt'].sort())
  })

  it('code is the text primary key', () => {
    const col = byKey.get('code')
    expect(col?.primary).toBe(true)
    expect(col?.getSQLType()).toBe('text')
  })

  it('label is NOT NULL; region is nullable', () => {
    expect(byKey.get('label')?.notNull).toBe(true)
    expect(byKey.get('region')?.notNull).toBe(false)
  })

  it('declares a label lookup index', () => {
    const idx = config.indexes.find((i) => i.config.name === 'states_by_label')
    expect(idx).toBeDefined()
    expect(idx?.config.unique).toBeFalsy()
  })
})

describe('districts table', () => {
  const config = getTableConfig(districts)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses the documented columns', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(['code', 'stateCode', 'label', 'createdAt'].sort())
  })

  it('code is the text primary key', () => {
    expect(byKey.get('code')?.primary).toBe(true)
  })

  it('stateCode is notNull (FK back to states)', () => {
    expect(byKey.get('stateCode')?.notNull).toBe(true)
  })

  it('declares per-parent + label indexes', () => {
    const names = config.indexes.map((i) => i.config.name).sort()
    expect(names).toEqual(['districts_by_label', 'districts_by_state'].sort())
  })

  it('FK references resolve (forces lazy lambdas)', () => {
    expect(config.foreignKeys.length).toBe(1)
    const ref = config.foreignKeys[0]?.reference()
    expect(ref?.columns.length).toBeGreaterThan(0)
  })
})

describe('parliamentary_constituencies table', () => {
  const config = getTableConfig(parliamentaryConstituencies)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses the documented columns', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(
      ['code', 'stateCode', 'districtCode', 'label', 'reservation', 'createdAt'].sort(),
    )
  })

  it('districtCode is NULLABLE (PCs may span districts)', () => {
    expect(byKey.get('districtCode')?.notNull).toBe(false)
  })

  it('reservation defaults to general', () => {
    const col = byKey.get('reservation')
    expect(col?.notNull).toBe(true)
    expect(col?.hasDefault).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: default value is internal
    expect((col as any).default).toBe('general')
  })

  it('declares state/district/label lookup indexes', () => {
    const names = config.indexes.map((i) => i.config.name).sort()
    expect(names).toEqual(['pcs_by_district', 'pcs_by_label', 'pcs_by_state'].sort())
  })

  it('FK references resolve (forces lazy lambdas)', () => {
    expect(config.foreignKeys.length).toBe(2)
    for (const fk of config.foreignKeys) {
      const ref = fk.reference()
      expect(ref.columns.length).toBeGreaterThan(0)
    }
  })
})

describe('assembly_constituencies table', () => {
  const config = getTableConfig(assemblyConstituencies)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses the documented columns', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(
      ['code', 'stateCode', 'districtCode', 'pcCode', 'label', 'reservation', 'createdAt'].sort(),
    )
  })

  it('pcCode is notNull (every AC sits inside exactly one PC)', () => {
    expect(byKey.get('pcCode')?.notNull).toBe(true)
  })

  it('districtCode is NULLABLE (some ACs span districts)', () => {
    expect(byKey.get('districtCode')?.notNull).toBe(false)
  })

  it('declares the four lookup indexes', () => {
    const names = config.indexes.map((i) => i.config.name).sort()
    expect(names).toEqual(['acs_by_district', 'acs_by_label', 'acs_by_pc', 'acs_by_state'].sort())
  })

  it('FK references resolve to the upstream tables (forces lazy lambdas)', () => {
    // stateCode → states, districtCode → districts, pcCode → pcs (3 total).
    expect(config.foreignKeys.length).toBe(3)
    for (const fk of config.foreignKeys) {
      const ref = fk.reference()
      expect(ref.columns.length).toBeGreaterThan(0)
      expect(ref.foreignColumns.length).toBeGreaterThan(0)
    }
  })
})
