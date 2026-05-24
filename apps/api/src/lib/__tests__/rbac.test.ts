/**
 * RBAC unit tests — `apps/api/src/lib/rbac.ts`.
 *
 * The resolver / middleware sits at the boundary between the public
 * surface and any admin write, so its matrix is small but absolute:
 *
 *   - context actor wins over header (production wave-2 ships the
 *     Supabase decoder upstream → reads from context).
 *   - trusted header only honoured when `FACTIVIST_TRUSTED_HEADER_AUTH=1`.
 *   - no env opt-in + no context = `public` actor (anonymous).
 *   - response on RBAC fail is a stable `{error:'unauthorized'}` at 401 —
 *     never 403, never a role enumeration.
 */

import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __resetWarnedForTests,
  ACTOR_KEY,
  type Actor,
  ROLES,
  requireAdmin,
  requireModerator,
  requireRole,
  resolveActor,
} from '../rbac.ts'

const buildApp = (allowed: Parameters<typeof requireRole>[0]) =>
  new Hono().get('/probe', requireRole(allowed), (c) => {
    const actor = c.get(ACTOR_KEY) as Actor
    return c.json({ ok: true, role: actor.role, id: actor.id })
  })

describe('ROLES constant', () => {
  it('lists the three Phase 5 roles', () => {
    expect(ROLES.slice().sort()).toEqual(['admin', 'moderator', 'public'].sort())
  })
})

describe('resolveActor — direct calls', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the context actor when upstream middleware set it', async () => {
    const app = new Hono().get('/x', (c) => {
      c.set(ACTOR_KEY, { id: 'usr_a', role: 'admin' } as Actor)
      const actor = resolveActor(c)
      return c.json(actor)
    })
    const res = await app.request('/x')
    const body = (await res.json()) as Actor
    expect(body.role).toBe('admin')
    expect(body.id).toBe('usr_a')
  })

  it('ignores an upstream context actor with an unknown role', async () => {
    const app = new Hono().get('/x', (c) => {
      c.set(ACTOR_KEY, { id: 'usr_a', role: 'root' } as unknown as Actor)
      return c.json(resolveActor(c))
    })
    const res = await app.request('/x')
    const body = (await res.json()) as Actor
    expect(body.role).toBe('public')
    expect(body.id).toBeNull()
  })

  it('reads x-factivist-role header ONLY when env flag is set to "1"', async () => {
    const app = new Hono().get('/x', (c) => c.json(resolveActor(c)))

    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '')
    const off = await app.request('/x', { headers: { 'x-factivist-role': 'admin' } })
    expect(((await off.json()) as Actor).role).toBe('public')

    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    const on = await app.request('/x', {
      headers: { 'x-factivist-role': 'admin', 'x-factivist-actor-id': 'usr_h' },
    })
    const body = (await on.json()) as Actor
    expect(body.role).toBe('admin')
    expect(body.id).toBe('usr_h')
  })

  it('ignores an unknown header role even with env flag on', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    const app = new Hono().get('/x', (c) => c.json(resolveActor(c)))
    const res = await app.request('/x', { headers: { 'x-factivist-role': 'root' } })
    const body = (await res.json()) as Actor
    expect(body.role).toBe('public')
  })

  it('defaults header actor id to null when not supplied', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    const app = new Hono().get('/x', (c) => c.json(resolveActor(c)))
    const res = await app.request('/x', { headers: { 'x-factivist-role': 'moderator' } })
    const body = (await res.json()) as Actor
    expect(body.role).toBe('moderator')
    expect(body.id).toBeNull()
  })

  it('returns frozen objects so handlers cannot mutate the resolved actor', async () => {
    const app = new Hono().get('/x', (c) => {
      const a = resolveActor(c)
      expect(Object.isFrozen(a)).toBe(true)
      return c.json(a)
    })
    await app.request('/x')
  })
})

describe('requireRole / requireAdmin / requireModerator — middleware matrix', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const ROLE_PROBES: ReadonlyArray<{
    readonly role: 'admin' | 'moderator' | 'public' | 'none'
    readonly headers?: HeadersInit
  }> = [
    { role: 'admin', headers: { 'x-factivist-role': 'admin', 'x-factivist-actor-id': 'usr_a' } },
    { role: 'moderator', headers: { 'x-factivist-role': 'moderator' } },
    { role: 'public', headers: { 'x-factivist-role': 'public' } },
    { role: 'none' /* no header at all */ },
  ]

  it('requireAdmin: only admin passes; everyone else is 401', async () => {
    const app = buildApp(['admin'])
    const results: Record<string, number> = {}
    for (const probe of ROLE_PROBES) {
      const res = await app.request('/probe', { headers: probe.headers })
      results[probe.role] = res.status
      if (res.status === 401) {
        const body = (await res.json()) as { error: string }
        expect(body).toEqual({ error: 'unauthorized' })
      }
    }
    expect(results).toEqual({ admin: 200, moderator: 401, public: 401, none: 401 })
  })

  it('requireModerator: admin + moderator pass; public + none are 401', async () => {
    const app = buildApp(['admin', 'moderator'])
    const results: Record<string, number> = {}
    for (const probe of ROLE_PROBES) {
      const res = await app.request('/probe', { headers: probe.headers })
      results[probe.role] = res.status
    }
    expect(results).toEqual({ admin: 200, moderator: 200, public: 401, none: 401 })
  })

  it('passes the resolved actor to the downstream handler', async () => {
    const app = buildApp(['admin', 'moderator'])
    const res = await app.request('/probe', {
      headers: { 'x-factivist-role': 'admin', 'x-factivist-actor-id': 'usr_admin' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { role: string; id: string }
    expect(body.role).toBe('admin')
    expect(body.id).toBe('usr_admin')
  })

  it('shorthand requireAdmin allows admin only', async () => {
    const app = new Hono().get('/probe', requireAdmin, (c) => c.json({ ok: true }))
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    const ok = await app.request('/probe', { headers: { 'x-factivist-role': 'admin' } })
    const no = await app.request('/probe', { headers: { 'x-factivist-role': 'moderator' } })
    expect(ok.status).toBe(200)
    expect(no.status).toBe(401)
  })

  it('shorthand requireModerator allows admin OR moderator', async () => {
    const app = new Hono().get('/probe', requireModerator, (c) => c.json({ ok: true }))
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    const a = await app.request('/probe', { headers: { 'x-factivist-role': 'admin' } })
    const m = await app.request('/probe', { headers: { 'x-factivist-role': 'moderator' } })
    const p = await app.request('/probe', { headers: { 'x-factivist-role': 'public' } })
    expect(a.status).toBe(200)
    expect(m.status).toBe(200)
    expect(p.status).toBe(401)
  })

  it('preserves identical 401 shape across "no auth" and "wrong role" (no enumeration)', async () => {
    const app = buildApp(['admin'])
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    const wrongRole = await app.request('/probe', { headers: { 'x-factivist-role': 'public' } })
    const noAuth = await app.request('/probe')
    expect(wrongRole.status).toBe(noAuth.status)
    expect(await wrongRole.json()).toEqual(await noAuth.json())
  })
})

describe('resolveActor — wave-2 NODE_ENV gate', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    __resetWarnedForTests()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    __resetWarnedForTests()
  })

  it('ignores trusted header when env flag is on but NODE_ENV is "production"', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'production')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const app = new Hono().get('/x', (c) => c.json(resolveActor(c)))
    const res = await app.request('/x', {
      headers: { 'x-factivist-role': 'admin', 'x-factivist-actor-id': 'usr_h' },
    })
    const body = (await res.json()) as Actor
    expect(body.role).toBe('public')
    expect(body.id).toBeNull()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })

  it('ignores trusted header when env flag is on but NODE_ENV is "development"', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'development')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const app = new Hono().get('/x', (c) => c.json(resolveActor(c)))
    const res = await app.request('/x', { headers: { 'x-factivist-role': 'admin' } })
    expect(((await res.json()) as Actor).role).toBe('public')
    warnSpy.mockRestore()
  })

  it('logs the misconfigured-flag warning only once per process', async () => {
    vi.stubEnv('FACTIVIST_TRUSTED_HEADER_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'production')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const app = new Hono().get('/x', (c) => c.json(resolveActor(c)))
    await app.request('/x', { headers: { 'x-factivist-role': 'admin' } })
    await app.request('/x', { headers: { 'x-factivist-role': 'admin' } })
    await app.request('/x', { headers: { 'x-factivist-role': 'admin' } })
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })

  it('upstream Supabase actor (factivist.actor on context) wins regardless of NODE_ENV', async () => {
    // Simulates supabaseAuthMiddleware having decoded a real bearer in
    // production — env flag stays off, NODE_ENV is production, but the
    // upstream context actor still resolves admin.
    vi.stubEnv('NODE_ENV', 'production')
    const app = new Hono().get('/x', (c) => {
      c.set(ACTOR_KEY, { id: 'usr_supabase_admin', role: 'admin' } as Actor)
      return c.json(resolveActor(c))
    })
    const res = await app.request('/x')
    const body = (await res.json()) as Actor
    expect(body.role).toBe('admin')
    expect(body.id).toBe('usr_supabase_admin')
  })
})
