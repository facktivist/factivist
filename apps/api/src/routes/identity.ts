import { createClient } from '@factivist/db/client'
import { citizens } from '@factivist/db/schema'
import {
  deriveHandle,
  type Nullifier,
  nullifierSchema,
  type SessionStatus,
  type VerifyProofResponse,
  verifyProofRequestSchema,
} from '@factivist/shared/validators'
import { verifyProofOnDevice, ZkpNotConfiguredError } from '@factivist/zkp-client'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'

import { isFlagEnabled } from '../lib/flags.ts'

/**
 * Identity routes — verify a citizen proof and report session status.
 *
 * Contract: `docs/architecture/phase-5/identity-contract.md`.
 * Aggregate: `docs/architecture/aggregates.md` §Citizen.
 *
 * Layout choices:
 *   - We open a per-request DB client. The Hono RPC type chain stays clean,
 *     and tests can stub `DATABASE_URL` without touching the lazy singleton.
 *   - Feature flags are read once per request (I-FF-3 in aggregates.md).
 *   - Errors are JSON envelopes with a stable machine-readable `code` so the
 *     web/mobile clients can branch on outcome without parsing prose.
 */

export const identityRoute = new Hono()
  .post(
    '/identity/verify',
    zValidator('json', verifyProofRequestSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            verified: false as const,
            error: 'invalid_proof',
            code: 'PROOF_MALFORMED' as const,
          } satisfies VerifyProofResponse,
          400,
        )
      }
    }),
    async (c) => {
      const url = process.env.DATABASE_URL
      if (!url) {
        return c.json(
          {
            verified: false as const,
            error: 'db_down',
            code: 'DB_DOWN' as const,
          } satisfies VerifyProofResponse,
          503,
        )
      }
      const db = createClient(url)

      // Phase 5 wave 1: writes are gated by S1_COMPLAINT_SUBMIT — verifying
      // identity is the first write that unlocks complaint submission, so
      // the same flag gates it.
      const submitEnabled = await isFlagEnabled(db, 'S1_COMPLAINT_SUBMIT')
      if (!submitEnabled) {
        return c.json(
          {
            verified: false as const,
            error: 'feature_disabled',
            code: 'S1_COMPLAINT_SUBMIT_OFF' as const,
          } satisfies VerifyProofResponse,
          503,
        )
      }

      const { proof, publicSignals } = c.req.valid('json')
      const [nullifierRaw, , stateCode, districtCode] = publicSignals

      // Defence-in-depth: re-parse the nullifier here so we catch any
      // mismatch between the route schema and the DB constraints.
      const nullifier = nullifierSchema.parse(nullifierRaw)

      // Step 1: device-side proof verification. We re-verify on the server
      // for now because we don't yet trust client-claimed proofs — Phase 5
      // wave 2 will move the canonical check on-chain via CitizenVerifier.
      try {
        const ok = await verifyProofOnDevice(proof, publicSignals)
        if (!ok) {
          return c.json(
            {
              verified: false as const,
              error: 'invalid_proof',
              code: 'PROOF_REJECTED' as const,
            } satisfies VerifyProofResponse,
            400,
          )
        }
      } catch (err) {
        if (err instanceof ZkpNotConfiguredError) {
          return c.json(
            {
              verified: false as const,
              error: 'zkp_not_configured',
              code: 'ZKP_NOT_CONFIGURED' as const,
            } satisfies VerifyProofResponse,
            503,
          )
        }
        throw err
      }

      // Step 2: idempotent insert. The unique index on `nullifier` is the
      // canonical "already used" check; we round-trip the row so we can
      // detect "same nullifier exists" vs "new row inserted".
      const inserted = await db
        .insert(citizens)
        .values({ nullifier, stateCode, districtCode })
        .onConflictDoNothing({ target: citizens.nullifier })
        .returning()

      if (inserted.length === 0) {
        // Already existed. For Phase 5 wave 1 we treat this as a 409 — the
        // session-binding layer that distinguishes "same device replays own
        // proof" from "different device replays" lands in Pipeline F.
        return c.json(
          {
            verified: false as const,
            error: 'nullifier_already_used',
            code: 'NULLIFIER_REPLAY' as const,
          } satisfies VerifyProofResponse,
          409,
        )
      }

      const row = inserted[0]
      if (!row) {
        return c.json(
          {
            verified: false as const,
            error: 'db_down',
            code: 'DB_DOWN' as const,
          } satisfies VerifyProofResponse,
          503,
        )
      }
      const handle = deriveHandle(nullifier)
      return c.json(
        {
          verified: true as const,
          handle,
          citizen: {
            handle,
            stateCode,
            districtCode,
            joinedAt: row.createdAt.toISOString(),
          },
        } satisfies VerifyProofResponse,
        200,
      )
    },
  )
  .get('/identity/session', async (c) => {
    // Phase 5 wave 1: we accept the header `x-factivist-nullifier` as a
    // stand-in for the session cookie. Wave 2 wires the cookie + signing.
    const claimed = c.req.header('x-factivist-nullifier')
    if (!claimed) {
      return c.json(
        {
          verified: false,
          handle: null,
          stateCode: null,
          districtCode: null,
        } satisfies SessionStatus,
        200,
      )
    }

    const url = process.env.DATABASE_URL
    if (!url) {
      return c.json(
        {
          verified: false,
          handle: null,
          stateCode: null,
          districtCode: null,
        } satisfies SessionStatus,
        503,
      )
    }
    const db = createClient(url)

    // Defensive parse — if the header isn't a valid nullifier, treat as anon.
    const parsed = nullifierSchema.safeParse(claimed)
    if (!parsed.success) {
      return c.json(
        {
          verified: false,
          handle: null,
          stateCode: null,
          districtCode: null,
        } satisfies SessionStatus,
        200,
      )
    }

    const rows = await db
      .select({
        stateCode: citizens.stateCode,
        districtCode: citizens.districtCode,
      })
      .from(citizens)
      .where(eq(citizens.nullifier, parsed.data))
      .limit(1)

    const row = rows[0]
    if (!row) {
      return c.json(
        {
          verified: false,
          handle: null,
          stateCode: null,
          districtCode: null,
        } satisfies SessionStatus,
        200,
      )
    }

    return c.json(
      {
        verified: true,
        handle: deriveHandle(parsed.data as Nullifier),
        stateCode: row.stateCode as SessionStatus['stateCode'],
        districtCode: row.districtCode as SessionStatus['districtCode'],
      } satisfies SessionStatus,
      200,
    )
  })

export type IdentityRoute = typeof identityRoute
