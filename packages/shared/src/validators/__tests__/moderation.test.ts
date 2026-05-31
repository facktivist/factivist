/**
 * Validator tests for the moderation + grievance surfaces.
 *
 * ## Why these tests exist
 *
 *   - `queueItemSchema` MUST reject any payload that bolts on a citizen
 *     identifier. The route handler already enumerates the SELECT columns,
 *     but defence-in-depth fails closed at the boundary the web app reads.
 *   - `moderationDecisionSchema` must clamp rationale to 500 chars and
 *     require a non-empty trimmed value.
 *   - `auditEventSchema.payloadHash` must be a 64-char hex SHA-256 — the
 *     audit row stores ONLY the digest, never the body.
 *   - `grievanceIntakeSchema` accepts a public complainant + a target ref.
 *
 * ATIDs satisfied: MOD-001, MOD-002, MOD-003, MOD-004, AUDIT-* (via
 * payload-hash invariant), GRIEVANCE-* (intake shape).
 */

import { describe, expect, it } from 'vitest'

import {
  auditEventSchema,
  grievanceIntakeSchema,
  moderationDecisionSchema,
  moderationReasonSchema,
  moderationStatusSchema,
  moderationTargetKindSchema,
  queueItemSchema,
} from '../moderation.ts'

const validQueueRow = {
  id: 'mq_bdf6fdbe-ee1b-410e-84b5-1928b2833a82',
  complaintSlug: 'pothole-on-mg-road',
  targetKind: 'complaint',
  reason: 'pii-leak',
  status: 'pending',
  reviewerId: null,
  slaDueAt: '2026-05-24T12:00:00.000Z',
  decidedAt: null,
  rationale: null,
  createdAt: '2026-05-23T12:00:00.000Z',
  updatedAt: '2026-05-23T12:00:00.000Z',
}

const validHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('moderationStatusSchema', () => {
  it('accepts the four lifecycle states', () => {
    for (const v of ['pending', 'approved', 'removed', 'escalated']) {
      expect(moderationStatusSchema.parse(v)).toBe(v)
    }
  })
  it('rejects unknown states', () => {
    expect(moderationStatusSchema.safeParse('done').success).toBe(false)
  })
})

describe('moderationReasonSchema', () => {
  it('includes pii-leak (ADR-0020)', () => {
    expect(moderationReasonSchema.parse('pii-leak')).toBe('pii-leak')
  })
  it('rejects unknown reasons', () => {
    expect(moderationReasonSchema.safeParse('hate').success).toBe(false)
  })
})

describe('moderationTargetKindSchema', () => {
  it('accepts complaint + comment', () => {
    expect(moderationTargetKindSchema.parse('complaint')).toBe('complaint')
    expect(moderationTargetKindSchema.parse('comment')).toBe('comment')
  })
  it('rejects unknown kinds', () => {
    expect(moderationTargetKindSchema.safeParse('user').success).toBe(false)
  })
})

describe('queueItemSchema — anonymity floor (ADR-0010 I-MOD-2)', () => {
  /**
   * Defence-in-depth note: `queueItemSchema` is a plain `z.object` so
   * unknown keys are *stripped* on parse (Zod default). The schema does
   * not throw on a leaky API payload — instead, the parsed output never
   * contains the forbidden key, so the UI cannot bind it even if the
   * upstream regressed. The structural guarantee that the leak cannot
   * exist in the DB at all lives in `moderation_queue.test.ts`.
   */

  it('parses a clean queue row round-trip', () => {
    const parsed = queueItemSchema.parse(validQueueRow)
    expect(parsed.id).toBe(validQueueRow.id)
    expect(parsed.reason).toBe('pii-leak')
  })

  const leakyFields = [
    ['nullifier', '0xdead'],
    ['nullifier_ref', 'ref'],
    ['reporterId', 'cit_1'],
    ['reporter_id', 'cit_1'],
    ['ip_address', '203.0.113.1'],
    ['user_agent', 'curl/8'],
    ['aadhaar', '999999999999'],
  ] as const

  for (const [field, value] of leakyFields) {
    it(`strips a leaked \`${field}\` from the parsed output`, () => {
      const parsed = queueItemSchema.parse({ ...validQueueRow, [field]: value }) as Record<
        string,
        unknown
      >
      expect(parsed[field]).toBeUndefined()
    })
  }

  it('the parsed shape contains ONLY whitelisted keys', () => {
    const parsed = queueItemSchema.parse({
      ...validQueueRow,
      nullifier: '0xdead',
      ip_address: '1.2.3.4',
      aadhaar: '9'.repeat(12),
    })
    expect(Object.keys(parsed).sort()).toEqual(
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

  it('rejects an id that is not a prefixed mq_ id', () => {
    const r = queueItemSchema.safeParse({ ...validQueueRow, id: 'usr_abc' })
    expect(r.success).toBe(false)
  })

  it('rejects a rationale over 500 chars', () => {
    const r = queueItemSchema.safeParse({ ...validQueueRow, rationale: 'x'.repeat(501) })
    expect(r.success).toBe(false)
  })

  it('rejects a non-ISO slaDueAt', () => {
    const r = queueItemSchema.safeParse({ ...validQueueRow, slaDueAt: 'tomorrow' })
    expect(r.success).toBe(false)
  })
})

describe('moderationDecisionSchema', () => {
  it('accepts approve + remove + escalate with a rationale', () => {
    for (const decision of ['approve', 'remove', 'escalate'] as const) {
      expect(moderationDecisionSchema.parse({ decision, rationale: 'looks fine' })).toEqual({
        decision,
        rationale: 'looks fine',
      })
    }
  })

  it('rejects an unknown decision verb', () => {
    expect(moderationDecisionSchema.safeParse({ decision: 'kill', rationale: 'x' }).success).toBe(
      false,
    )
  })

  it('trims rationale and rejects empty after trim', () => {
    expect(
      moderationDecisionSchema.safeParse({ decision: 'approve', rationale: '   ' }).success,
    ).toBe(false)
  })

  it('caps rationale at 500 chars', () => {
    expect(
      moderationDecisionSchema.safeParse({
        decision: 'approve',
        rationale: 'x'.repeat(501),
      }).success,
    ).toBe(false)
  })

  it('returns a typed result on success', () => {
    const parsed = moderationDecisionSchema.parse({ decision: 'remove', rationale: 'ncii' })
    expect(parsed.decision).toBe('remove')
  })
})

describe('auditEventSchema', () => {
  it('accepts every documented action verb', () => {
    for (const action of [
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
      'identity.prove_attempt',
    ] as const) {
      const r = auditEventSchema.safeParse({
        actor: 'usr_dev',
        action,
        targetKind: 'moderation_case',
        targetId: 'mq_1',
        payloadHash: validHash,
      })
      expect(r.success, `${action} should parse`).toBe(true)
    }
  })

  it('rejects a payloadHash that is not 64 hex chars', () => {
    expect(
      auditEventSchema.safeParse({
        actor: 'usr_dev',
        action: 'moderation.decide',
        targetKind: 'moderation_case',
        targetId: 'mq_1',
        payloadHash: 'not-a-hash',
      }).success,
    ).toBe(false)
  })

  it('rejects an unknown action', () => {
    expect(
      auditEventSchema.safeParse({
        actor: 'usr_dev',
        action: 'moderation.delete',
        targetKind: 'moderation_case',
        targetId: 'mq_1',
        payloadHash: validHash,
      }).success,
    ).toBe(false)
  })

  it('rejects an unknown targetKind', () => {
    expect(
      auditEventSchema.safeParse({
        actor: 'usr_dev',
        action: 'moderation.decide',
        targetKind: 'citizen',
        targetId: 'mq_1',
        payloadHash: validHash,
      }).success,
    ).toBe(false)
  })

  it('rejects an empty targetId', () => {
    expect(
      auditEventSchema.safeParse({
        actor: 'usr_dev',
        action: 'moderation.decide',
        targetKind: 'moderation_case',
        targetId: '',
        payloadHash: validHash,
      }).success,
    ).toBe(false)
  })

  it('accepts a UUID-shaped actor via the idSchema branch', () => {
    const r = auditEventSchema.safeParse({
      actor: 'bdf6fdbe-ee1b-410e-84b5-1928b2833a82',
      action: 'admin.grant',
      targetKind: 'admin',
      targetId: 'usr_x',
      payloadHash: validHash,
    })
    expect(r.success).toBe(true)
  })

  it('caps rationale at 500 chars', () => {
    const r = auditEventSchema.safeParse({
      actor: 'usr_dev',
      action: 'moderation.decide',
      targetKind: 'moderation_case',
      targetId: 'mq_1',
      payloadHash: validHash,
      rationale: 'x'.repeat(501),
    })
    expect(r.success).toBe(false)
  })
})

describe('grievanceIntakeSchema', () => {
  const valid = {
    complainantName: 'A. Journalist',
    complainantEmail: 'journo@example.com',
    targetRef: 'pothole-on-mg-road',
    reason: 'ncii',
    body: 'The published photo contains a recognisable bystander minor.',
  }

  it('accepts a valid grievance', () => {
    expect(grievanceIntakeSchema.parse(valid).reason).toBe('ncii')
  })

  it('rejects an invalid email', () => {
    expect(
      grievanceIntakeSchema.safeParse({ ...valid, complainantEmail: 'not-an-email' }).success,
    ).toBe(false)
  })

  it('rejects a body under 20 chars', () => {
    expect(grievanceIntakeSchema.safeParse({ ...valid, body: 'too short' }).success).toBe(false)
  })

  it('rejects an unknown reason', () => {
    expect(grievanceIntakeSchema.safeParse({ ...valid, reason: 'hate' }).success).toBe(false)
  })

  it('rejects a missing targetRef', () => {
    const { targetRef: _t, ...rest } = valid
    expect(grievanceIntakeSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects a complainant name over 120 chars', () => {
    expect(
      grievanceIntakeSchema.safeParse({ ...valid, complainantName: 'x'.repeat(121) }).success,
    ).toBe(false)
  })

  it('rejects a body over 5000 chars', () => {
    expect(grievanceIntakeSchema.safeParse({ ...valid, body: 'x'.repeat(5001) }).success).toBe(
      false,
    )
  })
})
