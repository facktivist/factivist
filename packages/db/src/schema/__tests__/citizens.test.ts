/**
 * Schema introspection tests for the `citizens` table.
 *
 * Per [[ADR-010]] (anonymity floor) + `docs/architecture/aggregates.md`
 * §Citizen, this table contains EXACTLY four columns. Adding any column
 * outside that set must trip this test until a new ADR ratifies it.
 *
 * Covers ATID-IDENT-001 (column shape) + ATID-IDENT-003 (no PII columns).
 */
import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { citizens } from '../citizens.ts'

describe('citizens table', () => {
  const config = getTableConfig(citizens)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses the plural snake_case table name', () => {
    expect(config.name).toBe('citizens')
  })

  it('exposes EXACTLY the four contracted columns (no extras, no missing)', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(['createdAt', 'districtCode', 'id', 'nullifier', 'stateCode'].sort())
  })

  it('every column is flagged to translate to snake_case at SQL emit time', () => {
    for (const col of config.columns) {
      // biome-ignore lint/suspicious/noExplicitAny: keyAsName is an internal flag
      expect((col as any).keyAsName).toBe(true)
    }
  })

  it('does NOT expose any banned PII column (ADR-010 anonymity floor)', () => {
    const banned = [
      'name',
      'aadhaar',
      'aadhaarHash',
      'aadhaar_hash',
      'dob',
      'gender',
      'photo',
      'photoBytes',
      'photo_bytes',
      'pin',
      'pincode',
      'gps',
      'lat',
      'lon',
      'ip',
      'ipHash',
      'ip_hash',
      'email',
      'phone',
      'userAgent',
      'user_agent',
      'deviceId',
      'device_id',
      'deviceFingerprint',
      'device_fingerprint',
      'sessionCookie',
      'session_cookie',
      'recoveryEmail',
      'recovery_email',
    ]
    const present = config.columns.map((c) => c.name)
    for (const b of banned) {
      expect(present, `Banned PII column '${b}' must not exist on citizens`).not.toContain(b)
    }
  })

  it('declares `id` as the primary key (text type, cit_ prefix)', () => {
    const id = byKey.get('id')
    expect(id).toBeDefined()
    expect(id?.primary).toBe(true)
    expect(id?.dataType).toBe('string')
    expect(id?.getSQLType()).toBe('text')
    // biome-ignore lint/suspicious/noExplicitAny: defaultFn is internal API
    const fn = (id as any).defaultFn as (() => string) | undefined
    expect(typeof fn).toBe('function')
    const value = fn?.()
    expect(value).toMatch(/^cit_[0-9a-f-]{36}$/)
  })

  it('marks `nullifier`, `stateCode`, `districtCode`, `createdAt` as NOT NULL', () => {
    expect(byKey.get('nullifier')?.notNull).toBe(true)
    expect(byKey.get('stateCode')?.notNull).toBe(true)
    expect(byKey.get('districtCode')?.notNull).toBe(true)
    expect(byKey.get('createdAt')?.notNull).toBe(true)
  })

  it('`nullifier` is text-typed (Drizzle text column)', () => {
    const n = byKey.get('nullifier')
    expect(n?.dataType).toBe('string')
    expect(n?.getSQLType()).toBe('text')
  })

  it('`stateCode` and `districtCode` are text-typed', () => {
    expect(byKey.get('stateCode')?.getSQLType()).toBe('text')
    expect(byKey.get('districtCode')?.getSQLType()).toBe('text')
  })

  it('`createdAt` uses timestamp with time zone and defaults to now()', () => {
    const col = byKey.get('createdAt')
    expect(col?.dataType).toBe('date')
    expect(col?.getSQLType()).toMatch(/timestamp with time zone/i)
    // biome-ignore lint/suspicious/noExplicitAny: hasDefault is internal
    expect((col as any).hasDefault).toBe(true)
  })

  it('declares a UNIQUE index on `nullifier`', () => {
    const idx = config.indexes.find((i) => i.config.name === 'citizens_nullifier_unique')
    expect(idx).toBeDefined()
    expect(idx?.config.unique).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: drizzle's index column union is internal
    const cols = idx?.config.columns.map((c: any) => c.name)
    expect(cols).toEqual(['nullifier'])
  })
})
