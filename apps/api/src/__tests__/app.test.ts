import { describe, expect, it } from 'vitest'

import { createApp } from '../app.ts'

describe('createApp', () => {
  it('returns a new Hono instance on every call (factory)', () => {
    const a = createApp()
    const b = createApp()
    expect(a).not.toBe(b)
  })

  it('mounts the health route', async () => {
    const app = createApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
  })

  it('returns 404 for unknown routes', async () => {
    const app = createApp()
    const res = await app.request('/does-not-exist')
    expect(res.status).toBe(404)
  })

  it('logger middleware does not crash request flow', async () => {
    const app = createApp()
    const res = await app.request('/health')
    // If the logger middleware threw, the response would be a 500 or rejected.
    expect(res.ok).toBe(true)
  })
})

describe('createApp — CORS', () => {
  it('defaults to wildcard (reflected as request origin under credentials) when no env is provided', async () => {
    // Hono's cors middleware reflects the request origin instead of emitting
    // a literal '*' when `credentials: true` is set (per CORS spec — `*` is
    // invalid with credentials). We assert presence + correct reflection.
    const app = createApp()
    const res = await app.request('/health', {
      headers: { Origin: 'http://anywhere.test' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('http://anywhere.test')
  })

  it('defaults to wildcard origin when env is provided without corsOrigin', async () => {
    // Exercises the `env?.corsOrigin ?? '*'` branch where env exists but
    // the key is undefined.
    const app = createApp({})
    const res = await app.request('/health', {
      headers: { Origin: 'http://anywhere.test' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('http://anywhere.test')
  })

  it('honors a custom origin when provided', async () => {
    const app = createApp({ corsOrigin: 'http://example.com' })
    const res = await app.request('/health', {
      headers: { Origin: 'http://example.com' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('http://example.com')
  })

  it('responds to OPTIONS preflight with CORS headers', async () => {
    const app = createApp({ corsOrigin: 'http://example.com' })
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    // Hono's cors middleware returns 204 No Content for preflight.
    expect([200, 204]).toContain(res.status)
    expect(res.headers.get('access-control-allow-origin')).toBe('http://example.com')
    expect(res.headers.get('access-control-allow-methods')).toBeTruthy()
  })
})
