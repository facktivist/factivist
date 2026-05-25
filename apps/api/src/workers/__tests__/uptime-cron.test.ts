import { describe, expect, it, vi } from 'vitest'

import { parseTargets, probe, reportDown, runScheduled } from '../uptime-cron.ts'

describe('parseTargets', () => {
  it('returns an empty array for undefined/empty input', () => {
    expect(parseTargets(undefined)).toEqual([])
    expect(parseTargets('')).toEqual([])
    expect(parseTargets('   \n  \n')).toEqual([])
  })

  it('splits on newlines, trims whitespace, and drops comments', () => {
    const raw = `
      https://factivist.example/
      # this is a comment
      https://api.factivist.example/healthz

      https://staging.factivist.example/
    `
    expect(parseTargets(raw)).toEqual([
      'https://factivist.example/',
      'https://api.factivist.example/healthz',
      'https://staging.factivist.example/',
    ])
  })
})

describe('probe', () => {
  it('marks a 200 OK as up + records latency', async () => {
    let now = 1_000
    const fetchImpl = vi.fn(async () => {
      now += 42
      return new Response('ok', { status: 200 })
    })
    const result = await probe(
      'https://up.example/',
      fetchImpl as unknown as typeof fetch,
      () => now,
    )
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
    expect(result.latencyMs).toBe(42)
    expect(result.error).toBeUndefined()
    expect(typeof result.ts).toBe('string')
  })

  it('treats 3xx as up (redirect: manual)', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 301 }))
    const result = await probe('https://redirect.example/', fetchImpl as unknown as typeof fetch)
    expect(result.ok).toBe(true)
    expect(result.status).toBe(301)
  })

  it('treats 5xx as down', async () => {
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 503 }))
    const result = await probe('https://broken.example/', fetchImpl as unknown as typeof fetch)
    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
  })

  it('returns status=0 and an error message when fetch throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('dns blew up')
    })
    const result = await probe('https://gone.example/', fetchImpl as unknown as typeof fetch)
    expect(result.ok).toBe(false)
    expect(result.status).toBe(0)
    expect(result.error).toBe('dns blew up')
  })

  it('stringifies non-Error throwables', async () => {
    const fetchImpl = vi.fn(async () => {
      // biome-ignore lint/suspicious/noExplicitAny: intentionally non-Error throw
      throw 'plain string' as any
    })
    const result = await probe('https://weird.example/', fetchImpl as unknown as typeof fetch)
    expect(result.error).toBe('plain string')
  })
})

describe('reportDown', () => {
  const downResult = {
    url: 'https://down.example/',
    status: 0,
    ok: false,
    latencyMs: 100,
    error: 'connect ETIMEDOUT',
    ts: '2026-05-25T00:00:00.000Z',
  } as const

  it('returns false when no webhook is configured', async () => {
    const fetchImpl = vi.fn()
    const ok = await reportDown(
      downResult,
      { UPTIME_TARGETS: '' },
      fetchImpl as unknown as typeof fetch,
    )
    expect(ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('POSTs the result to the webhook and includes the secret header when set', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    const ok = await reportDown(
      downResult,
      {
        UPTIME_TARGETS: '',
        UPTIME_WEBHOOK_URL: 'https://hook.example/x',
        UPTIME_WEBHOOK_SECRET: 'shhh',
      },
      fetchImpl as unknown as typeof fetch,
    )
    expect(ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['x-uptime-secret']).toBe('shhh')
    expect(JSON.parse(init.body as string)).toMatchObject({ url: downResult.url, ok: false })
  })

  it('omits the secret header when not configured', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    await reportDown(
      downResult,
      { UPTIME_TARGETS: '', UPTIME_WEBHOOK_URL: 'https://hook.example/x' },
      fetchImpl as unknown as typeof fetch,
    )
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['x-uptime-secret']).toBeUndefined()
  })

  it('returns false when the webhook responds non-2xx', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 }))
    const ok = await reportDown(
      downResult,
      { UPTIME_TARGETS: '', UPTIME_WEBHOOK_URL: 'https://hook.example/x' },
      fetchImpl as unknown as typeof fetch,
    )
    expect(ok).toBe(false)
  })

  it('swallows webhook fetch errors and returns false', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('webhook unreachable')
    })
    const ok = await reportDown(
      downResult,
      { UPTIME_TARGETS: '', UPTIME_WEBHOOK_URL: 'https://hook.example/x' },
      fetchImpl as unknown as typeof fetch,
    )
    expect(ok).toBe(false)
  })
})

describe('runScheduled', () => {
  it('returns [] when no targets are configured', async () => {
    const fetchImpl = vi.fn()
    const out = await runScheduled({ UPTIME_TARGETS: '' }, fetchImpl as unknown as typeof fetch)
    expect(out).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('probes every target in parallel and reports only the failures', async () => {
    const calls: string[] = []
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      calls.push(url)
      if (url.includes('hook.example')) return new Response(null, { status: 204 })
      if (url.includes('down')) return new Response('boom', { status: 503 })
      return new Response('ok', { status: 200 })
    })
    const out = await runScheduled(
      {
        UPTIME_TARGETS: ['https://up.example/', 'https://down.example/'].join('\n'),
        UPTIME_WEBHOOK_URL: 'https://hook.example/',
      },
      fetchImpl as unknown as typeof fetch,
    )
    expect(out).toHaveLength(2)
    expect(out.find((r) => r.url.includes('up'))?.ok).toBe(true)
    expect(out.find((r) => r.url.includes('down'))?.ok).toBe(false)
    // 2 probes + 1 webhook report
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(calls.some((c) => c.includes('hook.example'))).toBe(true)
  })

  it('does not call the webhook when every target is up', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok', { status: 200 }))
    await runScheduled(
      { UPTIME_TARGETS: 'https://up.example/', UPTIME_WEBHOOK_URL: 'https://hook.example/' },
      fetchImpl as unknown as typeof fetch,
    )
    // only the probe, no webhook POST
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
