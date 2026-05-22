import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { dbRoute } from './routes/db.ts'
import { healthRoute } from './routes/health.ts'

export interface AppEnv {
  /** Allowed CORS origin. Defaults to '*' when omitted. */
  corsOrigin?: string
}

/**
 * Build a fresh Hono app instance.
 *
 * IMPORTANT — chain all `.use()` / `.route()` calls in a single expression.
 * Hono's typed-client (`hc<AppType>`) relies on this fluent chain to infer
 * the full route surface. Assigning the app to an intermediate variable
 * mid-chain erases those types and breaks RPC consumers.
 */
export function createApp(env?: AppEnv) {
  const app = new Hono()
    .use('*', logger())
    .use(
      '*',
      cors({
        origin: env?.corsOrigin ?? '*',
        credentials: true,
      }),
    )
    .route('/', healthRoute)
    .route('/', dbRoute)

  return app
}

/** Chained app type for typed RPC clients (`hc<AppType>(...)`). */
export type AppType = ReturnType<typeof createApp>
