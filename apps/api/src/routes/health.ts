import { Hono } from 'hono'

/**
 * Health route. Kept tiny and side-effect-free so callers can mount it
 * at any prefix via `app.route('/', healthRoute)`.
 */
export const healthRoute = new Hono().get('/health', (c) => {
  return c.json({
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

export type HealthRoute = typeof healthRoute
