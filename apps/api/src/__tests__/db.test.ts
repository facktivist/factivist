import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const executeMock = vi.fn()
const createClientMock = vi.fn(() => ({ execute: executeMock }))

vi.mock('@factivist/db/client', () => ({
  createClient: createClientMock,
}))

describe('GET /db/ping', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    executeMock.mockReset()
    createClientMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 503 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { createApp } = await import('../app.ts')
    const res = await createApp().request('/db/ping')
    expect(res.status).toBe(503)
    const body = (await res.json()) as { db: string; reason: string }
    expect(body.db).toBe('down')
    expect(body.reason).toMatch(/DATABASE_URL/)
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('returns 200 + db=up when the select-1 probe succeeds', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    executeMock.mockResolvedValueOnce([{ ok: 1 }])
    const { createApp } = await import('../app.ts')
    const res = await createApp().request('/db/ping')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { db: string }
    expect(body.db).toBe('up')
    expect(createClientMock).toHaveBeenCalledWith('postgresql://test')
    expect(executeMock).toHaveBeenCalledOnce()
  })

  it('returns 200 + db=down when the probe rows are empty', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    executeMock.mockResolvedValueOnce([])
    const { createApp } = await import('../app.ts')
    const res = await createApp().request('/db/ping')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { db: string }
    expect(body.db).toBe('down')
  })

  it('returns 200 + db=down when the probe returns the wrong shape', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    executeMock.mockResolvedValueOnce([{ ok: 0 }])
    const { createApp } = await import('../app.ts')
    const res = await createApp().request('/db/ping')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { db: string }
    expect(body.db).toBe('down')
  })

  it('returns 503 when the underlying client throws', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    executeMock.mockRejectedValueOnce(new Error('connection refused'))
    const { createApp } = await import('../app.ts')
    const res = await createApp().request('/db/ping')
    expect(res.status).toBe(503)
    const body = (await res.json()) as { db: string; reason: string }
    expect(body.db).toBe('down')
    expect(body.reason).toContain('connection refused')
  })
})
