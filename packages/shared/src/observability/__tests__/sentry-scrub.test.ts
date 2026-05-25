import { describe, expect, it } from 'vitest'

import { beforeSend, dropBreadcrumbCategories, scrubString, scrubValue } from '../sentry-scrub.ts'

describe('scrubString', () => {
  it('passes through empty strings unchanged', () => {
    expect(scrubString('')).toBe('')
  })

  it('redacts plain Aadhaar numbers', () => {
    expect(scrubString('Aadhaar 123412341234 leaked')).toBe('Aadhaar [redacted] leaked')
  })

  it('redacts Aadhaar with spaces and hyphens', () => {
    expect(scrubString('1234 5678 9012')).toBe('[redacted]')
    expect(scrubString('1234-5678-9012')).toBe('[redacted]')
  })

  it('redacts email addresses', () => {
    expect(scrubString('contact procurement@theprocedure.in for details')).toBe(
      'contact [redacted] for details',
    )
  })

  it('redacts Indian phone numbers with +91', () => {
    expect(scrubString('call +91 98765 43210')).toBe('call [redacted]')
  })

  it('redacts Indian phone numbers without prefix', () => {
    expect(scrubString('phone 9876543210')).toBe('phone [redacted]')
  })

  it('redacts photo-paths but keeps the bucket prefix readable', () => {
    expect(scrubString('uploaded complaint-photos/abc/def-photo-1.jpg')).toBe(
      'uploaded complaint-photos/[redacted]',
    )
  })

  it('leaves nullifiers and tx hashes alone (they are public)', () => {
    const tx = '0x' + 'a'.repeat(64)
    expect(scrubString(tx)).toBe(tx)
  })

  it('handles multiple PII classes in one string', () => {
    const input = 'user procurement@theprocedure.in (1234 5678 9012) wrote'
    const out = scrubString(input)
    expect(out).not.toContain('@theprocedure')
    expect(out).not.toContain('1234 5678 9012')
    expect(out).toContain('[redacted]')
  })
})

describe('scrubValue', () => {
  it('returns null/undefined unchanged', () => {
    expect(scrubValue(null)).toBeNull()
    expect(scrubValue(undefined)).toBeUndefined()
  })

  it('returns primitives unchanged', () => {
    expect(scrubValue(42)).toBe(42)
    expect(scrubValue(true)).toBe(true)
  })

  it('redacts strings inside arrays', () => {
    expect(scrubValue(['ok', 'mail me at x@y.com'])).toEqual(['ok', 'mail me at [redacted]'])
  })

  it('redacts strings inside nested objects', () => {
    const input = {
      message: 'user x@y.com hit /complaint-photos/abc/123',
      tags: { phone: '+91 98765 43210' },
      meta: { count: 7, ok: true },
    }
    const out = scrubValue(input)
    expect(out.message).not.toContain('@y.com')
    expect(out.tags.phone).toBe('[redacted]')
    expect(out.meta).toEqual({ count: 7, ok: true })
  })

  it('does not loop on cyclic references', () => {
    const a: { self?: unknown; name: string } = { name: 'x@y.com' }
    a.self = a
    const out = scrubValue(a)
    expect(out.name).toBe('[redacted]')
  })
})

describe('beforeSend', () => {
  it('drops synthetic test events', () => {
    expect(beforeSend({ tags: { __factivist_test_synthetic__: true } })).toBeNull()
  })

  it('scrubs request bodies and breadcrumbs', () => {
    const event = {
      request: { data: 'aadhaar 1234 5678 9012 here' },
      breadcrumbs: [{ message: 'user x@y.com clicked' }],
      tags: { region: 'bom' },
    }
    const out = beforeSend(event)
    expect(out).not.toBeNull()
    expect((out!.request as Record<string, string>).data).toContain('[redacted]')
    const crumbs = out!.breadcrumbs as Array<{ message: string }>
    expect(crumbs[0].message).toContain('[redacted]')
    // Non-PII tags survive
    expect((out!.tags as Record<string, string>).region).toBe('bom')
  })
})

describe('dropBreadcrumbCategories', () => {
  it('exports the expected categories', () => {
    expect(dropBreadcrumbCategories).toEqual(['console', 'xhr', 'fetch'])
  })
})
