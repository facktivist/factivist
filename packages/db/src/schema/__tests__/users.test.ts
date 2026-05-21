import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { users } from '../users.ts'

describe('users table', () => {
  const config = getTableConfig(users)
  const byKey = new Map(config.columns.map((c) => [c.name, c]))

  it('uses the plural snake_case table name', () => {
    expect(config.name).toBe('users')
  })

  it('exposes the expected columns (camelCase keys; snake_case in SQL)', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(
      [
        'id',
        'email',
        'displayName',
        'avatarUrl',
        'emailVerifiedAt',
        'createdAt',
        'updatedAt',
      ].sort(),
    )
    // Every column is flagged to translate to snake_case at SQL emit time.
    for (const col of config.columns) {
      // biome-ignore lint/suspicious/noExplicitAny: keyAsName is an internal flag
      expect((col as any).keyAsName).toBe(true)
    }
  })

  it('declares `id` as the primary key (text type)', () => {
    const id = byKey.get('id')
    expect(id).toBeDefined()
    expect(id?.primary).toBe(true)
    expect(id?.dataType).toBe('string')
    expect(id?.getSQLType()).toBe('text')
  })

  it('marks `email` and `displayName` as NOT NULL', () => {
    expect(byKey.get('email')?.notNull).toBe(true)
    expect(byKey.get('displayName')?.notNull).toBe(true)
  })

  it('allows nulls on `avatarUrl` and `emailVerifiedAt`', () => {
    expect(byKey.get('avatarUrl')?.notNull).toBe(false)
    expect(byKey.get('emailVerifiedAt')?.notNull).toBe(false)
  })

  it('declares a unique index on `email`', () => {
    const emailIndex = config.indexes.find((idx) => idx.config.name === 'users_email_unique')
    expect(emailIndex).toBeDefined()
    expect(emailIndex?.config.unique).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: drizzle's index column union is internal
    const indexedColumns = emailIndex?.config.columns.map((col: any) => col.name)
    expect(indexedColumns).toEqual(['email'])
  })

  it('uses timestamp with time zone for createdAt/updatedAt/emailVerifiedAt', () => {
    for (const key of ['createdAt', 'updatedAt', 'emailVerifiedAt'] as const) {
      const col = byKey.get(key)
      expect(col?.dataType).toBe('date')
      expect(col?.getSQLType()).toMatch(/timestamp with time zone/i)
    }
  })

  it('generates a `usr_`-prefixed id via $defaultFn', () => {
    const id = byKey.get('id')
    // biome-ignore lint/suspicious/noExplicitAny: defaultFn is internal API
    const fn = (id as any).defaultFn as (() => string) | undefined
    expect(typeof fn).toBe('function')
    const value = fn?.()
    expect(value).toMatch(/^usr_[0-9a-f-]{36}$/)
  })

  it('produces a fresh Date via $onUpdate for updatedAt', () => {
    const updated = byKey.get('updatedAt')
    // biome-ignore lint/suspicious/noExplicitAny: onUpdateFn is internal API
    const fn = (updated as any).onUpdateFn as (() => Date) | undefined
    expect(typeof fn).toBe('function')
    const value = fn?.()
    expect(value).toBeInstanceOf(Date)
  })

  it('uses defaultNow on createdAt/updatedAt', () => {
    expect(byKey.get('createdAt')?.hasDefault).toBe(true)
    expect(byKey.get('updatedAt')?.hasDefault).toBe(true)
  })
})
