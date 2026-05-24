import { describe, expect, it } from 'vitest'

import {
  COMPLAINT_BODY_MAX,
  COMPLAINT_DISCLAIMER,
  COMPLAINT_PHOTO_MAX,
  COMPLAINT_TITLE_MAX,
  constituencyTupleSchema,
  createComplaintInputSchema,
  discoveryFiltersSchema,
  FLAG_REASON_LABEL,
  FLAG_REASONS,
  flagComplaintInputSchema,
  flagReasonSchema,
} from '../complaint.ts'

const validTuple = {
  stateCode: 'ka',
  districtCode: 'blr-u',
  pcCode: 'blr-s',
  acCode: 'btm-layout',
}

describe('COMPLAINT_DISCLAIMER', () => {
  it('is the verbatim legal string', () => {
    expect(COMPLAINT_DISCLAIMER).toBe('User-submitted; not verified by Factivist.')
  })
})

describe('FLAG_REASONS', () => {
  it('includes pii-leak as the first item per ADR-020 priority', () => {
    expect(FLAG_REASONS[0]).toBe('pii-leak')
  })

  it('has a human-readable label for every reason', () => {
    for (const r of FLAG_REASONS) {
      expect(FLAG_REASON_LABEL[r]).toBeTypeOf('string')
      expect(FLAG_REASON_LABEL[r].length).toBeGreaterThan(0)
    }
  })

  it('flagReasonSchema accepts every listed reason', () => {
    for (const r of FLAG_REASONS) expect(flagReasonSchema.parse(r)).toBe(r)
  })

  it('flagReasonSchema rejects unknown reasons', () => {
    expect(flagReasonSchema.safeParse('defamation').success).toBe(false)
  })
})

describe('constituencyTupleSchema', () => {
  it('accepts a valid slug tuple', () => {
    expect(constituencyTupleSchema.parse(validTuple)).toEqual(validTuple)
  })

  it('rejects when any slug is missing', () => {
    const { acCode: _ac, ...rest } = validTuple
    expect(constituencyTupleSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects uppercase slugs', () => {
    expect(constituencyTupleSchema.safeParse({ ...validTuple, stateCode: 'KA' }).success).toBe(
      false,
    )
  })
})

describe('createComplaintInputSchema', () => {
  const base = {
    title: 'Pothole on MG Road',
    body: 'There has been a pothole at the corner of MG and Brigade for 3 weeks.',
    categorySlug: 'roads-infrastructure',
    ...validTuple,
    photoUrls: [],
  }

  it('accepts a minimal valid input', () => {
    const parsed = createComplaintInputSchema.parse(base)
    expect(parsed.title).toBe(base.title)
    expect(parsed.photoUrls).toEqual([])
  })

  it('rejects empty title', () => {
    expect(createComplaintInputSchema.safeParse({ ...base, title: '   ' }).success).toBe(false)
  })

  it('rejects title above COMPLAINT_TITLE_MAX', () => {
    const r = createComplaintInputSchema.safeParse({
      ...base,
      title: 'x'.repeat(COMPLAINT_TITLE_MAX + 1),
    })
    expect(r.success).toBe(false)
  })

  it('rejects body above COMPLAINT_BODY_MAX', () => {
    const r = createComplaintInputSchema.safeParse({
      ...base,
      body: 'x'.repeat(COMPLAINT_BODY_MAX + 1),
    })
    expect(r.success).toBe(false)
  })

  it('rejects more than COMPLAINT_PHOTO_MAX photos', () => {
    const photos = Array.from(
      { length: COMPLAINT_PHOTO_MAX + 1 },
      (_, i) => `https://cdn.factivist.in/p/${i}.jpg`,
    )
    const r = createComplaintInputSchema.safeParse({ ...base, photoUrls: photos })
    expect(r.success).toBe(false)
  })

  it('defaults photoUrls to []', () => {
    const { photoUrls: _ignored, ...rest } = base
    const r = createComplaintInputSchema.parse(rest)
    expect(r.photoUrls).toEqual([])
  })

  it('rejects non-URL photo entries', () => {
    const r = createComplaintInputSchema.safeParse({ ...base, photoUrls: ['not-a-url'] })
    expect(r.success).toBe(false)
  })
})

describe('discoveryFiltersSchema', () => {
  it('applies defaults', () => {
    const parsed = discoveryFiltersSchema.parse({})
    expect(parsed.page).toBe(1)
    expect(parsed.pageSize).toBe(20)
    expect(parsed.sort).toBe('newest')
  })

  it('coerces string query params', () => {
    const parsed = discoveryFiltersSchema.parse({ page: '4', pageSize: '10' })
    expect(parsed.page).toBe(4)
    expect(parsed.pageSize).toBe(10)
  })

  it('rejects page=0', () => {
    expect(discoveryFiltersSchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it('clamps pageSize at 50', () => {
    expect(discoveryFiltersSchema.safeParse({ pageSize: 51 }).success).toBe(false)
  })

  it('rejects unknown sort values', () => {
    expect(discoveryFiltersSchema.safeParse({ sort: 'trending' }).success).toBe(false)
  })

  it('accepts an empty q omitted (no `q` key)', () => {
    const parsed = discoveryFiltersSchema.parse({})
    expect(parsed.q).toBeUndefined()
  })

  it('trims a non-empty q', () => {
    const parsed = discoveryFiltersSchema.parse({ q: '  potholes  ' })
    expect(parsed.q).toBe('potholes')
  })
})

describe('flagComplaintInputSchema', () => {
  it('accepts a minimal flag input', () => {
    expect(flagComplaintInputSchema.parse({ reason: 'pii-leak' })).toEqual({ reason: 'pii-leak' })
  })

  it('accepts an optional note', () => {
    const parsed = flagComplaintInputSchema.parse({
      reason: 'harassment',
      note: 'Targeted at a private citizen.',
    })
    expect(parsed.note).toBe('Targeted at a private citizen.')
  })

  it('rejects a note over 500 chars', () => {
    const r = flagComplaintInputSchema.safeParse({
      reason: 'spam',
      note: 'x'.repeat(501),
    })
    expect(r.success).toBe(false)
  })

  it('rejects an unknown reason', () => {
    expect(flagComplaintInputSchema.safeParse({ reason: 'defamation' }).success).toBe(false)
  })
})
