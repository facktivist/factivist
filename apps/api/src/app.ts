import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { supabaseAuthMiddleware } from './lib/supabase-auth.ts'
import { adminAuditRoute } from './routes/admin/audit.ts'
import { adminGrievanceRoute } from './routes/admin/grievance.ts'
import { adminGrievancesRoute } from './routes/admin/grievances.ts'
import { adminModerationRoute } from './routes/admin/moderation.ts'
import { categoriesRoute } from './routes/categories.ts'
import { commentRoute } from './routes/comment.ts'
import { complaintRoute } from './routes/complaint.ts'
import { constituencyRoute } from './routes/constituency.ts'
import { dbRoute } from './routes/db.ts'
import { discoveryRoute } from './routes/discovery.ts'
import { healthRoute } from './routes/health.ts'
import { identityRoute } from './routes/identity.ts'
import { profileRoute } from './routes/profile.ts'
import { uploadsRoute } from './routes/uploads.ts'

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
    // Resolve Supabase Auth bearer BEFORE any route is mounted.
    // No-op when SUPABASE_URL is unset; never 401s by itself —
    // see apps/api/src/lib/supabase-auth.ts.
    .use('*', supabaseAuthMiddleware())
    .route('/', healthRoute)
    .route('/', dbRoute)
    .route('/', identityRoute)
    .route('/', categoriesRoute)
    .route('/', constituencyRoute)
    .route('/', discoveryRoute)
    .route('/', complaintRoute)
    .route('/', commentRoute)
    .route('/', profileRoute)
    .route('/', uploadsRoute)
    .route('/', adminModerationRoute)
    .route('/', adminGrievanceRoute)
    .route('/', adminGrievancesRoute)
    .route('/', adminAuditRoute)

  return app
}

/** Chained app type for typed RPC clients (`hc<AppType>(...)`). */
export type AppType = ReturnType<typeof createApp>
