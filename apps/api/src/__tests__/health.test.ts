import { describe, expect, it } from 'vitest'

import { healthRoute } from '../routes/health.ts'

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

describe('GET /health', () => {
  it('returns 200 with status, timestamp, and uptime', async () => {
    const res = await healthRoute.request('/health')
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      status: string
      timestamp: string
      uptime: number
    }

    expect(body.status).toBe('ok')
    expect(body.timestamp).toMatch(ISO_8601)
    expect(Number.isFinite(body.uptime)).toBe(true)
    expect(body.uptime).toBeGreaterThanOrEqual(0)

    // timestamp must be parseable to a real Date
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false)
  })
})
