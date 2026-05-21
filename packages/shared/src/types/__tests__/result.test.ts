import { describe, expect, it } from 'vitest'

import { err, isErr, isOk, ok, unwrap } from '../result.ts'

describe('ok / err constructors', () => {
  it('creates a success result', () => {
    const result = ok(42)
    expect(result).toEqual({ ok: true, data: 42 })
  })

  it('creates a failure result', () => {
    const result = err(new Error('nope'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toBe('nope')
  })
})

describe('isOk / isErr', () => {
  it('narrows the success branch', () => {
    const result = ok('hello')
    expect(isOk(result)).toBe(true)
    expect(isErr(result)).toBe(false)
  })

  it('narrows the failure branch', () => {
    const result = err('bad')
    expect(isOk(result)).toBe(false)
    expect(isErr(result)).toBe(true)
  })
})

describe('unwrap', () => {
  it('returns the data on success', () => {
    expect(unwrap(ok(7))).toBe(7)
  })

  it('throws the embedded Error instance unchanged', () => {
    const boom = new Error('boom')
    expect(() => unwrap(err(boom))).toThrow(boom)
  })

  it('wraps non-Error failures in a new Error', () => {
    expect(() => unwrap(err('string error'))).toThrowError('string error')
    expect(() => unwrap(err(404))).toThrowError('404')
  })
})
