/**
 * Schema tests for `audit_log` (ADR-0015 INSERT-only / 180-day retention).
 *
 * The table is append-only at the application layer. There is no
 * `updatedAt`, no mutable field, and no FK relaxes the I-MOD-3 / X-7
 * "audit write happens in the same txn as the business write" guarantee.
 *
 * These tests fail closed if a future refactor:
 *   - drops the (actor, ts) or (targetKind, targetId, ts) index, OR
 *   - adds an `updatedAt`/mutable column, OR
 *   - changes the retention floor away from 180 days, OR
 *   - omits the `payloadHash` column (the SHA-256 of the request body).
 */

import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import {
  AUDIT_LOG_RETENTION_DAYS,
  auditActionEnum,
  auditLog,
  auditTargetKindEnum,
} from '../audit_log.ts'

const config = getTableConfig(auditLog)
const byKey = new Map(config.columns.map((c) => [c.name, c]))

const PII_COLUMN_PATTERN =
  /nullifier|aadhaar|ip_address|user_agent|legal_name|photo_bytes|reporter/i

describe('audit_log table', () => {
  it('uses the singular snake_case table name', () => {
    expect(config.name).toBe('audit_log')
  })

  it('exposes the canonical column whitelist — and nothing more', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(
      ['id', 'actor', 'action', 'targetKind', 'targetId', 'payloadHash', 'rationale', 'ts'].sort(),
    )
  })

  it('has NO `updatedAt`/`deletedAt` — append-only at the schema level', () => {
    expect(byKey.has('updatedAt')).toBe(false)
    expect(byKey.has('deletedAt')).toBe(false)
    expect(byKey.has('modifiedAt')).toBe(false)
  })

  it('contains NO citizen-identifying columns', () => {
    for (const col of config.columns) {
      expect(
        PII_COLUMN_PATTERN.test(col.name),
        `forbidden citizen-identifying column leaked: ${col.name}`,
      ).toBe(false)
    }
  })

  it('declares `id` as text PK with `al_` prefix via $defaultFn', () => {
    const id = byKey.get('id')
    expect(id?.primary).toBe(true)
    expect(id?.getSQLType()).toBe('text')
    // biome-ignore lint/suspicious/noExplicitAny: defaultFn is internal API
    const fn = (id as any).defaultFn as (() => string) | undefined
    expect(typeof fn).toBe('function')
    expect(fn?.()).toMatch(/^al_[0-9a-f-]{36}$/)
  })

  it('marks the audit primary fields as NOT NULL', () => {
    for (const key of ['actor', 'action', 'targetKind', 'targetId', 'payloadHash', 'ts'] as const) {
      expect(byKey.get(key)?.notNull, `${key} should be NOT NULL`).toBe(true)
    }
  })

  it('permits NULL only on `rationale`', () => {
    expect(byKey.get('rationale')?.notNull).toBe(false)
  })

  it('uses timestamp with time zone for `ts` and defaults to now()', () => {
    expect(byKey.get('ts')?.getSQLType()).toMatch(/timestamp with time zone/i)
    expect(byKey.get('ts')?.hasDefault).toBe(true)
  })

  it('has a (actor, ts) index for "what did admin X do"', () => {
    const idx = config.indexes.find((i) => i.config.name === 'audit_log_by_actor')
    expect(idx).toBeDefined()
    // biome-ignore lint/suspicious/noExplicitAny: drizzle index column type is internal
    const cols = idx?.config.columns.map((c: any) => c.name)
    expect(cols).toEqual(['actor', 'ts'])
  })

  it('has a (targetKind, targetId, ts) index for "what happened to case Y"', () => {
    const idx = config.indexes.find((i) => i.config.name === 'audit_log_by_target')
    expect(idx).toBeDefined()
    // biome-ignore lint/suspicious/noExplicitAny: drizzle index column type is internal
    const cols = idx?.config.columns.map((c: any) => c.name)
    expect(cols).toEqual(['targetKind', 'targetId', 'ts'])
  })

  it('has a btree index on `ts` to keep the CERT-In retention sweep sub-second', () => {
    const idx = config.indexes.find((i) => i.config.name === 'audit_log_by_ts')
    expect(idx).toBeDefined()
  })
})

describe('AUDIT_LOG_RETENTION_DAYS', () => {
  it('is exactly 180 days per ADR-0015 / CERT-In direction', () => {
    expect(AUDIT_LOG_RETENTION_DAYS).toBe(180)
  })

  it('is a literal-typed constant', () => {
    // Type-level assertion via const expression — value is frozen.
    const x: 180 = AUDIT_LOG_RETENTION_DAYS
    expect(x).toBe(180)
  })
})

describe('auditActionEnum', () => {
  it('covers every Phase 5 admin write path plus the identity.prove_attempt audit anchor', () => {
    expect(auditActionEnum.enumValues.slice().sort()).toEqual(
      [
        'moderation.decide',
        'moderation.escalate',
        'moderation.claim',
        'moderation.release',
        'grievance.acknowledge',
        'grievance.resolve',
        'feature_flag.enable',
        'feature_flag.disable',
        'admin.grant',
        'admin.revoke',
        // wave-2C: the only non-operator action in this table; actor is the
        // literal `'anonymous'` and the targetId is an opaque request UUID
        // (never a citizen identifier — anonymity invariant preserved).
        'identity.prove_attempt',
      ].sort(),
    )
  })
})

describe('auditTargetKindEnum', () => {
  it('covers every artifact kind referenced by an admin write plus session for prove_attempt', () => {
    expect(auditTargetKindEnum.enumValues.slice().sort()).toEqual(
      [
        'complaint',
        'comment',
        'moderation_case',
        'grievance',
        'feature_flag',
        'admin',
        // wave-2C: opaque per-request anchor for identity.prove_attempt rows.
        'session',
      ].sort(),
    )
  })
})
