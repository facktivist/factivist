/**
 * Public type surface for typed RPC consumers.
 *
 *   import type { AppType } from '@factivist/api/types'
 *   import { hc } from 'hono/client'
 *
 *   const client = hc<AppType>('http://localhost:3001')
 */
export type { AppType } from './app.ts'
export type { HealthRoute } from './routes/health.ts'
