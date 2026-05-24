/**
 * `getServerSession` unit tests.
 *
 * The resolver gates the entire `/admin` shell. Its branches are small
 * but absolute: cookie > trusted header (only when env opt-in) > null.
 *
 * `next/headers` is mocked per-test because Next.js' module is a
 * server-runtime singleton — we substitute a tiny in-memory store and
 * re-import the resolver between cases.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeCookieStore {
  get(name: string): { value: string } | undefined
}
interface FakeHeaderStore {
  get(name: string): string | null
}

const cookieRef: { current: FakeCookieStore } = { current: { get: () => undefined } }
const headerRef: { current: FakeHeaderStore } = { current: { get: () => null } }

vi.mock('next/headers', () => ({
  cookies: async () => cookieRef.current,
  headers: async () => headerRef.current,
}))

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  cookieRef.current = { get: () => undefined }
  headerRef.current = { get: () => null }
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const encodeEnvelope = (env: Record<string, unknown>): string =>
  Buffer.from(JSON.stringify(env), 'utf-8').toString('base64')

describe('getServerSession — cookie branch', () => {
  it('returns admin session for a valid cookie envelope', async () => {
    cookieRef.current = {
      get: (n) =>
        n === 'factivist-session'
          ? { value: encodeEnvelope({ userId: 'usr_admin', role: 'admin', token: 'jwt-1' }) }
          : undefined,
    }
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session).toEqual({ userId: 'usr_admin', role: 'admin', token: 'jwt-1' })
  })

  it('returns moderator session for the moderator role', async () => {
    cookieRef.current = {
      get: () => ({ value: encodeEnvelope({ userId: 'usr_mod', role: 'moderator' }) }),
    }
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session?.role).toBe('moderator')
    expect(session?.token).toBeNull()
  })

  it('defaults userId to "dev-operator" when envelope omits it', async () => {
    cookieRef.current = { get: () => ({ value: encodeEnvelope({ role: 'admin' }) }) }
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session?.userId).toBe('dev-operator')
  })

  it('returns null for a cookie with a non-admin role', async () => {
    cookieRef.current = { get: () => ({ value: encodeEnvelope({ role: 'public' }) }) }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('returns null for a cookie that is not base64 JSON', async () => {
    cookieRef.current = { get: () => ({ value: 'not-base64-json!!' }) }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('returns null for a cookie whose envelope is not an object', async () => {
    cookieRef.current = {
      get: () => ({ value: Buffer.from('null', 'utf-8').toString('base64') }),
    }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('returns null for an envelope with a non-string role', async () => {
    cookieRef.current = { get: () => ({ value: encodeEnvelope({ role: 1 }) }) }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })
})

describe('getServerSession — header branch (FACTIVIST_TRUSTED_HEADER_AUTH gate)', () => {
  it('returns null when env flag is unset even if header is present', async () => {
    headerRef.current = {
      get: (n) =>
        n === 'x-factivist-role' ? 'admin' : n === 'x-factivist-actor-id' ? 'usr_h' : null,
    }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('returns admin session from header when env flag is "1"', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
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

  it('returns null from header when role is not admin/moderator', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    headerRef.current = { get: (n) => (n === 'x-factivist-role' ? 'public' : null) }
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })

  it('defaults header user to "dev-operator" when actor-id header missing', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    headerRef.current = { get: (n) => (n === 'x-factivist-role' ? 'admin' : null) }
    const { getServerSession } = await import('../server.ts')
    const session = await getServerSession()
    expect(session?.userId).toBe('dev-operator')
  })
})

describe('getServerSession — null fallback', () => {
  it('returns null when no cookie, no header, no env opt-in', async () => {
    const { getServerSession } = await import('../server.ts')
    expect(await getServerSession()).toBeNull()
  })
})
