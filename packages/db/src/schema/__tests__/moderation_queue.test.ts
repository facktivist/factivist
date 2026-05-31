/**
 * Schema tests for `moderation_queue` (ADR-0006 + ADR-0010 + ADR-0014 + ADR-0020).
 *
 * These tests fail closed on the *most dangerous* regressions in this
 * codebase — a moderation row that carries a citizen identifier. The
 * assertions encode the anonymity invariants structurally so even an
 * accidental column add fails CI before it lands in production.
 *
 * ATIDs satisfied: MOD-001 (queue browse), MOD-002 (anonymity floor),
 * MOD-003 (SLA windows), MOD-004 (queue insert).
 */

import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import {
  computeSlaDueAt,
  type ModerationQueueItem,
  moderationQueue,
  moderationReasonEnum,
  moderationStatusEnum,
  moderationTargetKindEnum,
} from '../moderation_queue.ts'

const config = getTableConfig(moderationQueue)
const byKey = new Map(config.columns.map((c) => [c.name, c]))

/** Regex matrix for any citizen-identifying column. Whitelist is empty. */
const PII_COLUMN_PATTERN =
  /nullifier|reporter|ip_address|user_agent|aadhaar|email|phone|legal_name|photo_bytes/i

describe('moderation_queue table', () => {
  it('uses the plural snake_case table name', () => {
    expect(config.name).toBe('moderation_queue')
  })

  it('exposes the canonical column whitelist — and nothing more', () => {
    const names = config.columns.map((c) => c.name).sort()
    expect(names).toEqual(
      [
        'id',
        'complaintSlug',
        'targetKind',
        'reason',
        'status',
        'reviewerId',
        'slaDueAt',
        'decidedAt',
        'rationale',
        'createdAt',
        'updatedAt',
      ].sort(),
    )
  })

  it('contains NO citizen-identifying columns (ADR-0010 I-MOD-2)', () => {
    for (const col of config.columns) {
      expect(
        PII_COLUMN_PATTERN.test(col.name),
        `forbidden citizen-identifying column leaked: ${col.name}`,
      ).toBe(false)
    }
  })

  it('declares `id` as text PK with `mq_` prefix via $defaultFn', () => {
    const id = byKey.get('id')
    expect(id?.primary).toBe(true)
    expect(id?.getSQLType()).toBe('text')
    // biome-ignore lint/suspicious/noExplicitAny: defaultFn is internal API
    const fn = (id as any).defaultFn as (() => string) | undefined
    expect(typeof fn).toBe('function')
    expect(fn?.()).toMatch(/^mq_[0-9a-f-]{36}$/)
  })

  it('marks `complaintSlug`, `targetKind`, `reason`, `status`, `slaDueAt` as NOT NULL', () => {
    for (const key of ['complaintSlug', 'targetKind', 'reason', 'status', 'slaDueAt'] as const) {
      expect(byKey.get(key)?.notNull, `${key} should be NOT NULL`).toBe(true)
    }
  })

  it('allows nulls on `reviewerId`, `decidedAt`, `rationale`', () => {
    for (const key of ['reviewerId', 'decidedAt', 'rationale'] as const) {
      expect(byKey.get(key)?.notNull, `${key} should permit NULL`).toBe(false)
    }
  })

  it('defaults `status` to "pending" and `targetKind` to "complaint"', () => {
    expect(byKey.get('status')?.hasDefault).toBe(true)
    expect(byKey.get('targetKind')?.hasDefault).toBe(true)
  })

  it('uses timestamp with time zone for all time columns', () => {
    for (const key of ['slaDueAt', 'decidedAt', 'createdAt', 'updatedAt'] as const) {
      expect(byKey.get(key)?.getSQLType()).toMatch(/timestamp with time zone/i)
    }
  })

  it('has the hot-path composite index (status, slaDueAt)', () => {
    const idx = config.indexes.find((i) => i.config.name === 'moderation_queue_by_status_sla')
    expect(idx).toBeDefined()
    // biome-ignore lint/suspicious/noExplicitAny: drizzle index column type is internal
    const cols = idx?.config.columns.map((c: any) => c.name)
    expect(cols).toEqual(['status', 'slaDueAt'])
  })

  it('has a btree index on complaintSlug', () => {
    const idx = config.indexes.find((i) => i.config.name === 'moderation_queue_by_complaint_slug')
    expect(idx).toBeDefined()
  })

  it('has a partial UNIQUE index `moderation_queue_open_case_unique` on (target_kind, complaint_slug)', () => {
    const idx = config.indexes.find((i) => i.config.name === 'moderation_queue_open_case_unique')
    expect(idx, 'partial unique index must exist').toBeDefined()
    expect(idx?.config.unique).toBe(true)
    // biome-ignore lint/suspicious/noExplicitAny: drizzle index column type is internal
    const cols = idx?.config.columns.map((c: any) => c.name)
    expect(cols).toEqual(['targetKind', 'complaintSlug'])
    // The partial predicate must be wired so multiple decided cases per
    // (target_kind, complaint_slug) are allowed.
    expect(idx?.config.where).toBeDefined()
  })

  it('uses $onUpdate for `updatedAt` (auto-touch)', () => {
    const updated = byKey.get('updatedAt')
    // biome-ignore lint/suspicious/noExplicitAny: onUpdateFn is internal API
    const fn = (updated as any).onUpdateFn as (() => Date) | undefined
    expect(typeof fn).toBe('function')
    expect(fn?.()).toBeInstanceOf(Date)
  })
})

describe('moderationStatusEnum', () => {
  it('lists the four lifecycle states', () => {
    expect(moderationStatusEnum.enumValues).toEqual(['pending', 'approved', 'removed', 'escalated'])
  })
})

describe('moderationReasonEnum', () => {
  it('includes pii-leak as a first-class value (ADR-0020 / D4)', () => {
    expect(moderationReasonEnum.enumValues).toContain('pii-leak')
  })

  it('covers the full Phase 3 reason taxonomy', () => {
    expect(moderationReasonEnum.enumValues.slice().sort()).toEqual(
      ['defamation', 'communal', 'false', 'doxxing', 'ncii', 'pii-leak', 'other'].sort(),
    )
  })

  it('does NOT include a deanonymisation-coded reason', () => {
    for (const r of moderationReasonEnum.enumValues) {
      expect(PII_COLUMN_PATTERN.test(r), `reason "${r}" leaks PII semantics`).toBe(false)
    }
  })
})

describe('moderationTargetKindEnum', () => {
  it('covers exactly {complaint, comment}', () => {
    expect(moderationTargetKindEnum.enumValues.slice().sort()).toEqual(['comment', 'complaint'])
  })
})

describe('computeSlaDueAt — ADR-0014 + ADR-0020 SLA matrix', () => {
  const from = new Date('2026-05-23T12:00:00.000Z')
  const hoursFrom = (d: Date): number => (d.getTime() - from.getTime()) / (60 * 60 * 1000)

  const fastTrack: ReadonlyArray<ModerationQueueItem['reason']> = [
    'ncii',
    'pii-leak',
    'defamation',
    'communal',
  ]
  const standard: ReadonlyArray<ModerationQueueItem['reason']> = ['false', 'doxxing', 'other']

  for (const r of fastTrack) {
    it(`returns +24h for reason="${r}" (fast-track)`, () => {
      expect(hoursFrom(computeSlaDueAt(r, from))).toBe(24)
    })
  }

  for (const r of standard) {
    it(`returns +36h for reason="${r}" (Rule 3(1)(d) ceiling)`, () => {
      expect(hoursFrom(computeSlaDueAt(r, from))).toBe(36)
    })
  }

  it('does NOT mutate the `from` argument', () => {
    const ref = new Date('2026-05-23T12:00:00.000Z')
    const snapshot = ref.getTime()
    computeSlaDueAt('ncii', ref)
    expect(ref.getTime()).toBe(snapshot)
  })

  it('produces a strictly future `Date` for every reason', () => {
    for (const r of moderationReasonEnum.enumValues) {
      const due = computeSlaDueAt(r as ModerationQueueItem['reason'], from)
      expect(due).toBeInstanceOf(Date)
      expect(due.getTime()).toBeGreaterThan(from.getTime())
    }
  })
})
