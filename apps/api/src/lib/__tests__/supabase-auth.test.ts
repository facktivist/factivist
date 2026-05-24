/**
 * `supabaseAuthMiddleware` unit tests — wave-2.
 *
 * The middleware decodes `Authorization: Bearer <jwt>` exactly once per
 * request, publishes the resolved actor on `c.set('factivist.actor', …)`,
 * and falls through silently on every failure mode so a missing/invalid
 * token is indistinguishable from no token at the rbac layer.
 *
 * `@supabase/supabase-js` is mocked at the module boundary — the real
 * SDK never opens a socket in this test file.
 */

import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeUser {
  id: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

const supabaseStub: {
  user: FakeUser | null
  error: { message: string } | null
  createClientCalls: number
  lastToken: string | null
} = {
  user: null,
  error: null,
  createClientCalls: 0,
  lastToken: null,
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, _key: string) => {
    supabaseStub.createClientCalls += 1
    return {
      auth: {
        getUser: async (token: string) => {
          supabaseStub.lastToken = token
          return {
            data: { user: supabaseStub.user },
            error: supabaseStub.error,
          }
        },
      },
    }
  },
}))

// Import AFTER the mock.
import { ACTOR_KEY, type Actor } from '../rbac.ts'
import { __resetSupabaseClientForTests, supabaseAuthMiddleware } from '../supabase-auth.ts'

const buildProbeApp = () =>
  new Hono().use('*', supabaseAuthMiddleware()).get('/whoami', (c) => {
    const actor = c.get(ACTOR_KEY) as Actor | undefined
    return c.json({
      role: actor?.role ?? 'public',
      id: actor?.id ?? null,
      token: (c.get('factivist.token') as string | undefined) ?? null,
    })
  })

beforeEach(() => {
  vi.unstubAllEnvs()
  __resetSupabaseClientForTests()
  supabaseStub.user = null
  supabaseStub.error = null
  supabaseStub.createClientCalls = 0
  supabaseStub.lastToken = null
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const stubSupabaseEnv = () => {
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
}

describe('supabaseAuthMiddleware — env gate', () => {
  it('is a no-op when SUPABASE_URL is unset (never builds a client)', async () => {
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-x' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { role: string }
    expect(body.role).toBe('public')
    expect(supabaseStub.createClientCalls).toBe(0)
  })

  it('is a no-op when SUPABASE_SERVICE_ROLE_KEY is unset', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-x' },
    })
    expect(supabaseStub.createClientCalls).toBe(0)
    const body = (await res.json()) as { role: string }
    expect(body.role).toBe('public')
  })
})

describe('supabaseAuthMiddleware — bearer extraction', () => {
  beforeEach(stubSupabaseEnv)

  it('falls through when no Authorization header present', async () => {
    const res = await buildProbeApp().request('/whoami')
    expect((await res.json()) as { role: string }).toEqual({
      role: 'public',
      id: null,
      token: null,
    })
    // Never reached the SDK because there is no token to verify.
    expect(supabaseStub.createClientCalls).toBe(0)
  })

  it('falls through on a non-Bearer Authorization scheme', async () => {
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    })
    expect(((await res.json()) as { role: string }).role).toBe('public')
    expect(supabaseStub.createClientCalls).toBe(0)
  })

  it('accepts a lowercase "authorization" header', async () => {
    supabaseStub.user = { id: 'usr_admin', app_metadata: { role: 'admin' } }
    const res = await buildProbeApp().request('/whoami', {
      headers: { authorization: 'Bearer jwt-low' },
    })
    expect((await res.json()) as { role: string }).toMatchObject({ role: 'admin' })
    expect(supabaseStub.lastToken).toBe('jwt-low')
  })
})

describe('supabaseAuthMiddleware — role resolution', () => {
  beforeEach(stubSupabaseEnv)

  it('sets admin actor when app_metadata.role is "admin"', async () => {
    supabaseStub.user = { id: 'usr_a', app_metadata: { role: 'admin' } }
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-a' },
    })
    expect((await res.json()) as { role: string; id: string; token: string }).toEqual({
      role: 'admin',
      id: 'usr_a',
      token: 'jwt-a',
    })
  })

  it('sets moderator actor when app_metadata.role is "moderator"', async () => {
    supabaseStub.user = { id: 'usr_m', app_metadata: { role: 'moderator' } }
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-m' },
    })
    expect(((await res.json()) as { role: string }).role).toBe('moderator')
  })

  it('falls back to user_metadata.role when app_metadata is absent', async () => {
    supabaseStub.user = { id: 'usr_a', user_metadata: { role: 'admin' } }
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-a' },
    })
    expect(((await res.json()) as { role: string }).role).toBe('admin')
  })

  it('prefers app_metadata over user_metadata when both set', async () => {
    supabaseStub.user = {
      id: 'usr_a',
      app_metadata: { role: 'admin' },
      user_metadata: { role: 'moderator' },
    }
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-a' },
    })
    expect(((await res.json()) as { role: string }).role).toBe('admin')
  })

  it('falls through (public) when the user has no role claim — citizen path', async () => {
    supabaseStub.user = { id: 'usr_citizen', app_metadata: {}, user_metadata: {} }
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-c' },
    })
    expect(((await res.json()) as { role: string }).role).toBe('public')
  })

  it('falls through (public) when role claim is an unknown string', async () => {
    supabaseStub.user = { id: 'usr_x', app_metadata: { role: 'root' } }
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-x' },
    })
    expect(((await res.json()) as { role: string }).role).toBe('public')
  })
})

describe('supabaseAuthMiddleware — error handling', () => {
  beforeEach(stubSupabaseEnv)

  it('falls through when Supabase reports an error', async () => {
    supabaseStub.user = null
    supabaseStub.error = { message: 'jwt expired' }
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-expired' },
    })
    expect(((await res.json()) as { role: string }).role).toBe('public')
  })

  it('falls through when Supabase returns no user and no error', async () => {
    supabaseStub.user = null
    supabaseStub.error = null
    const res = await buildProbeApp().request('/whoami', {
      headers: { Authorization: 'Bearer jwt-null' },
    })
    expect(((await res.json()) as { role: string }).role).toBe('public')
  })

  it('reuses the cached client across requests (singleton)', async () => {
    supabaseStub.user = { id: 'usr_a', app_metadata: { role: 'admin' } }
    const app = buildProbeApp()
    await app.request('/whoami', { headers: { Authorization: 'Bearer jwt-1' } })
    await app.request('/whoami', { headers: { Authorization: 'Bearer jwt-2' } })
    expect(supabaseStub.createClientCalls).toBe(1)
  })
})
