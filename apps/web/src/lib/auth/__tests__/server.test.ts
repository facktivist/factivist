/**
 * `getServerSession` unit tests — wave-2.
 *
 * The resolver gates the entire `/admin` shell. Its branches are
 * small but absolute:
 *
 *   A. Real Supabase session (cookie) → wins over everything.
 *   B. Test-mode escape hatch headers → only when env flag AND
 *      NODE_ENV=test are both set.
 *   C. `null` otherwise.
 *
 * Both `next/headers` and `@supabase/ssr` are mocked at the module
 * boundary so each test can build a deterministic env. `vi.resetModules`
 * between cases keeps the module-local one-shot warning state honest.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeCookieStore {
  get(name: string): { value: string } | undefined
  getAll(): Array<{ name: string; value: string }>
}
interface FakeHeaderStore {
  get(name: string): string | null
}
interface FakeSupabaseUser {
  id: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

const cookieRef: { current: FakeCookieStore } = {
  current: { get: () => undefined, getAll: () => [] },
}
const headerRef: { current: FakeHeaderStore } = { current: { get: () => null } }

const supabaseStub: {
  user: FakeSupabaseUser | null
  userError: { message: string } | null
  sessionToken: string | null
  createServerClientCalls: number
} = {
  user: null,
  userError: null,
  sessionToken: null,
  createServerClientCalls: 0,
}

vi.mock('next/headers', () => ({
  cookies: async () => cookieRef.current,
  headers: async () => headerRef.current,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string) => {
    supabaseStub.createServerClientCalls += 1
    return {
      auth: {
        getUser: async () => ({
          data: { user: supabaseStub.user },
          error: supabaseStub.userError,
        }),
        getSession: async () => ({
          data: {
            session: supabaseStub.sessionToken ? { access_token: supabaseStub.sessionToken } : null,
          },
          error: null,
        }),
      },
    }
  },
}))

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  cookieRef.current = { get: () => undefined, getAll: () => [] }
  headerRef.current = { get: () => null }
  supabaseStub.user = null
  supabaseStub.userError = null
  supabaseStub.sessionToken = null
  supabaseStub.createServerClientCalls = 0
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const stubSupabaseEnv = () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-test-key')
}

describe('getServerSession — Supabase branch (production / staging path)', () => {
  it('returns admin session when app_metadata.role is "admin"', async () => {
    stubSupabaseEnv()
    supabaseStub.user = { id: 'usr_admin', app_metadata: { role: 'admin' } }
    supabaseStub.sessionToken = 'jwt-from-supabase'
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session).toEqual({
      userId: 'usr_admin',
      role: 'admin',
      token: 'jwt-from-supabase',
    })
    expect(supabaseStub.createServerClientCalls).toBe(1)
  })

  it('returns moderator session when app_metadata.role is "moderator"', async () => {
    stubSupabaseEnv()
    supabaseStub.user = { id: 'usr_mod', app_metadata: { role: 'moderator' } }
    supabaseStub.sessionToken = 'jwt-mod'
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session?.role).toBe('moderator')
    expect(session?.token).toBe('jwt-mod')
  })

  it('falls back to user_metadata.role when app_metadata is empty', async () => {
    stubSupabaseEnv()
    supabaseStub.user = {
      id: 'usr_admin',
      app_metadata: {},
      user_metadata: { role: 'admin' },
    }
    supabaseStub.sessionToken = 'jwt-user-meta'
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session?.role).toBe('admin')
  })

  it('prefers app_metadata.role over user_metadata.role when both set', async () => {
    stubSupabaseEnv()
    supabaseStub.user = {
      id: 'usr_admin',
      app_metadata: { role: 'admin' },
      user_metadata: { role: 'moderator' },
    }
    supabaseStub.sessionToken = 'jwt-1'
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session?.role).toBe('admin')
  })

  it('returns null for a citizen (authenticated, no role claim)', async () => {
    stubSupabaseEnv()
    supabaseStub.user = { id: 'usr_citizen', app_metadata: {}, user_metadata: {} }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('returns null when Supabase reports an error', async () => {
    stubSupabaseEnv()
    supabaseStub.user = null
    supabaseStub.userError = { message: 'jwt expired' }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('returns null when the Supabase user object has an unknown role string', async () => {
    stubSupabaseEnv()
    supabaseStub.user = { id: 'usr_x', app_metadata: { role: 'root' } }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('does NOT call createServerClient when Supabase env is unset', async () => {
    // No stubSupabaseEnv() — verifies the zero-network path.
    const { getServerSession } = await import('../server.ts')
    await getServerSession()
    expect(supabaseStub.createServerClientCalls).toBe(0)
  })
})

describe('getServerSession — test-mode escape hatch', () => {
  it('returns null when env flag is unset even with header present', async () => {
    headerRef.current = {
      get: (n) =>
        n === 'x-factivist-role' ? 'admin' : n === 'x-factivist-actor-id' ? 'usr_h' : null,
    }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('honours header when env flag AND NODE_ENV=test are both set', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'test')
    headerRef.current = {
      get: (n) =>
        n === 'x-factivist-role'
          ? 'admin'
          : n === 'x-factivist-actor-id'
            ? 'usr_h'
            : n === 'x-factivist-token'
              ? 'jwt-h'
              : null,
    }
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session).toEqual({ userId: 'usr_h', role: 'admin', token: 'jwt-h' })
  })

  it('returns null when env flag is set but NODE_ENV != "test"', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'production')
    headerRef.current = {
      get: (n) => (n === 'x-factivist-role' ? 'admin' : null),
    }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })

  it('warns only ONCE about a misconfigured flag (one-shot)', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'production')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { getServerSession, __resetWarnedForTests } = await import('../server.ts')
    __resetWarnedForTests()
    await getServerSession()
    await getServerSession()
    await getServerSession()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })

  it('returns null from header branch when role is not admin/moderator', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'test')
    headerRef.current = { get: (n) => (n === 'x-factivist-role' ? 'public' : null) }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('defaults header userId to "dev-operator" when actor-id header missing', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'test')
    headerRef.current = { get: (n) => (n === 'x-factivist-role' ? 'admin' : null) }
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session?.userId).toBe('dev-operator')
    expect(session?.token).toBeNull()
  })
})

describe('getServerSession — resolution order', () => {
  it('Supabase session WINS over test header when both are present', async () => {
    stubSupabaseEnv()
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'test')
    supabaseStub.user = { id: 'usr_supabase', app_metadata: { role: 'admin' } }
    supabaseStub.sessionToken = 'jwt-supabase'
    headerRef.current = {
      get: (n) =>
        n === 'x-factivist-role' ? 'moderator' : n === 'x-factivist-actor-id' ? 'usr_h' : null,
    }
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session?.userId).toBe('usr_supabase')
    expect(session?.role).toBe('admin')
  })

  it('falls through to header when Supabase has no admin role + NODE_ENV=test', async () => {
    stubSupabaseEnv()
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'test')
    supabaseStub.user = { id: 'usr_citizen', app_metadata: {}, user_metadata: {} }
    headerRef.current = {
      get: (n) =>
        n === 'x-factivist-role' ? 'admin' : n === 'x-factivist-actor-id' ? 'usr_h' : null,
    }
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session?.userId).toBe('usr_h')
    expect(session?.role).toBe('admin')
  })
})

describe('getServerSession — null fallback', () => {
  it('returns null when no Supabase env, no header, no env opt-in', async () => {
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })
})
