import { NextRequest, NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `@supabase/ssr` is replaced with a tiny test double so we can drive
 * the cookie-rotation path without spinning a real Supabase project.
 */
type SetAllArg = ReadonlyArray<{
  name: string
  value: string
  options?: Record<string, unknown>
}>

interface FakeCookieHook {
  readonly getAll: () => Array<{ name: string; value: string }>
  readonly setAll: (toSet: SetAllArg) => void
}

let lastClientOptions: { cookies?: FakeCookieHook } | undefined
let getUserBehaviour: 'rotate' | 'noop' | 'throw' = 'noop'

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: FakeCookieHook }) => {
    lastClientOptions = opts
    return {
      auth: {
        getUser: vi.fn(async () => {
          if (getUserBehaviour === 'throw') throw new Error('boom')
          if (getUserBehaviour === 'rotate') {
            opts.cookies.setAll([
              {
                name: 'sb-access-token',
                value: 'rotated-token-v2',
                options: { path: '/', httpOnly: true, sameSite: 'lax', secure: true },
              },
            ])
          }
          return { data: { user: { id: 'usr_admin' } }, error: null }
        }),
      },
    }
  },
}))

import { refreshAdminSession } from '../middleware.ts'

const makeRequest = (cookies: Record<string, string> = {}): NextRequest => {
  const url = 'https://test.factivist.in/admin/moderation'
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  const headers = new Headers()
  if (cookieHeader) headers.set('cookie', cookieHeader)
  // Use the real NextRequest constructor so its `.cookies` API is wired up.
  return new NextRequest(url, { headers })
}

beforeEach(() => {
  lastClientOptions = undefined
  getUserBehaviour = 'noop'
  vi.unstubAllEnvs()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('refreshAdminSession', () => {
  it('returns a pass-through response when Supabase env vars are unset', async () => {
    vi.unstubAllEnvs()
    const req = makeRequest({ 'sb-access-token': 'token-v1' })
    const res = await refreshAdminSession(req)
    expect(res).toBeInstanceOf(NextResponse)
    // Never built a Supabase client.
    expect(lastClientOptions).toBeUndefined()
  })

  it('builds a Supabase client whose getAll mirrors the request cookies', async () => {
    const req = makeRequest({ 'sb-access-token': 'token-v1', 'sb-refresh-token': 'refresh-v1' })
    await refreshAdminSession(req)
    expect(lastClientOptions?.cookies).toBeDefined()
    const cookies = lastClientOptions!.cookies!.getAll()
    expect(cookies).toEqual(
      expect.arrayContaining([
        { name: 'sb-access-token', value: 'token-v1' },
        { name: 'sb-refresh-token', value: 'refresh-v1' },
      ]),
    )
  })

  it('attaches rotated cookies to the response when @supabase/ssr triggers setAll', async () => {
    getUserBehaviour = 'rotate'
    const req = makeRequest({ 'sb-access-token': 'token-v1' })
    const res = await refreshAdminSession(req)
    const rotated = res.cookies.get('sb-access-token')
    expect(rotated?.value).toBe('rotated-token-v2')
  })

  it('still returns a NextResponse when getUser throws (graceful degrade)', async () => {
    getUserBehaviour = 'throw'
    const req = makeRequest({ 'sb-access-token': 'token-v1' })
    const res = await refreshAdminSession(req)
    expect(res).toBeInstanceOf(NextResponse)
    // No rotation happened, but the response is still well-formed.
    expect(res.cookies.get('sb-access-token')?.value).toBeUndefined()
  })
})
