import { z } from 'zod'

/**
 * Identity context validators — shared between `apps/api`, `apps/web`,
 * `apps/mobile`, and `@factivist/zkp-client`.
 *
 * Source: `docs/architecture/phase-5/identity-contract.md` §1, §3.
 * Per [[ADR-002]] this package owns the canonical Zod definitions; per
 * [[ADR-010]] none of these schemas may grow PII fields without an ADR.
 */

/** 0x-prefixed 32-byte hex string (the anoncitizen circuit's nullifier). */
const NULLIFIER_REGEX = /^0x[0-9a-f]{64}$/

export const nullifierSchema = z
  .preprocess(
    (v) => (typeof v === 'string' ? v.toLowerCase() : v),
    z.string().regex(NULLIFIER_REGEX, 'Must be a 0x-prefixed 32-byte hex string'),
  )
  .brand<'Nullifier'>()

export type Nullifier = z.infer<typeof nullifierSchema>

/** Decimal stringified unsigned integer — used for epoch + bigint signals. */
const decimalStringSchema = z.string().regex(/^\d+$/, 'Must be a decimal string')

/** ECI 2-letter state code (uppercased). */
export const stateCodeSchema = z
  .preprocess(
    (v) => (typeof v === 'string' ? v.toUpperCase() : v),
    z.string().regex(/^[A-Z]{2}$/, 'Must be a 2-letter ECI state code'),
  )
  .brand<'StateCode'>()

export type StateCode = z.infer<typeof stateCodeSchema>

/** District code: `<state>-<seq>` (e.g. `KA-09`). */
export const districtCodeSchema = z
  .preprocess(
    (v) => (typeof v === 'string' ? v.toUpperCase() : v),
    z.string().regex(/^[A-Z]{2}-\d{1,4}$/, 'Must be a `<STATE>-<seq>` district code'),
  )
  .brand<'DistrictCode'>()

export type DistrictCode = z.infer<typeof districtCodeSchema>

/**
 * Groth16 proof envelope as produced by snarkjs / rapidsnark.
 *
 * The exact shape is dictated by the prover libraries; we validate it
 * structurally so the route can fail fast on malformed payloads before
 * burning CPU on `groth16.verify`.
 */
export const groth16ProofSchema = z.object({
  pi_a: z.tuple([decimalStringSchema, decimalStringSchema, decimalStringSchema]),
  pi_b: z.tuple([
    z.tuple([decimalStringSchema, decimalStringSchema]),
    z.tuple([decimalStringSchema, decimalStringSchema]),
    z.tuple([decimalStringSchema, decimalStringSchema]),
  ]),
  pi_c: z.tuple([decimalStringSchema, decimalStringSchema, decimalStringSchema]),
  protocol: z.literal('groth16'),
  curve: z.literal('bn128'),
})

export type Groth16Proof = z.infer<typeof groth16ProofSchema>

/**
 * Public signals as ordered in the anoncitizen circuit:
 *   [0] nullifier   — Hex<32>
 *   [1] epoch       — decimal string
 *   [2] stateCode   — ECI 2-char
 *   [3] districtCode — `<state>-<seq>`
 */
export const verifyPublicSignalsSchema = z.tuple([
  nullifierSchema,
  decimalStringSchema,
  stateCodeSchema,
  districtCodeSchema,
])

export type VerifyPublicSignals = z.infer<typeof verifyPublicSignalsSchema>

export const verifyProofRequestSchema = z.object({
  proof: groth16ProofSchema,
  publicSignals: verifyPublicSignalsSchema,
  sessionNonce: z.string().min(16).max(128),
})

export type VerifyProofRequest = z.infer<typeof verifyProofRequestSchema>

/** Public, PII-free citizen view returned by the verify route. */
export const citizenPublicViewSchema = z.object({
  handle: z.string(),
  stateCode: stateCodeSchema,
  districtCode: districtCodeSchema,
  joinedAt: z.iso.datetime({ offset: true }),
})

export type CitizenPublicView = z.infer<typeof citizenPublicViewSchema>

/** Successful verify response (first-time or idempotent replay of own proof). */
export const verifyProofSuccessSchema = z.object({
  verified: z.literal(true),
  handle: z.string(),
  citizen: citizenPublicViewSchema,
  idempotent: z.boolean().optional(),
})

/** Failure envelopes — discriminated by `code`. */
export const verifyProofErrorSchema = z.object({
  verified: z.literal(false),
  error: z.string(),
  code: z.enum([
    'NULLIFIER_REPLAY',
    'PROOF_MALFORMED',
    'PROOF_REJECTED',
    'S1_COMPLAINT_SUBMIT_OFF',
    'DB_DOWN',
    'ZKP_NOT_CONFIGURED',
  ]),
})

export const verifyProofResponseSchema = z.discriminatedUnion('verified', [
  verifyProofSuccessSchema,
  verifyProofErrorSchema,
])

export type VerifyProofResponse = z.infer<typeof verifyProofResponseSchema>
export type VerifyProofSuccess = z.infer<typeof verifyProofSuccessSchema>
export type VerifyProofError = z.infer<typeof verifyProofErrorSchema>

/** GET /identity/session response. */
export const sessionStatusSchema = z.object({
  verified: z.boolean(),
  handle: z.string().nullable(),
  stateCode: stateCodeSchema.nullable(),
  districtCode: districtCodeSchema.nullable(),
})

export type SessionStatus = z.infer<typeof sessionStatusSchema>

// ─── Server-side proving (POST /identity/prove) ──────────────────────────
//
// Per ADR-0011 (hybrid ZKP) + identity-wiring.md §5.2: low-end devices
// post the raw circuit witness to the API and receive back the
// `(proof, publicSignals)` envelope they then submit to `/identity/verify`.
//
// The witness contains the Aadhaar number (12 digits) plus the nullifier
// seed and the two photo halves. The route MUST treat the witness as
// transient memory only — see `apps/api/src/lib/zkp-prover.ts` for the
// zeroisation contract (per OQ-4 in identity-wiring.md and
// `zkp-key-custody.md` §Server-side fallback rule #4).

/**
 * 12-digit Aadhaar number, never persisted server-side. Pure validator
 * — NO defaults, NO `transform()` that could mask malformed input — so a
 * malformed payload always surfaces as a 400 with `code: 'PROOF_MALFORMED'`
 * (the validator never silently coerces a citizen identifier).
 */
export const aadhaarNumberSchema = z.string().regex(/^\d{12}$/, 'Must be a 12-digit Aadhaar number')

/**
 * 0x-prefixed 32-byte hex string (the per-citizen nullifier seed). Pure
 * validator, no preprocessing — same rationale as `aadhaarNumberSchema`.
 */
export const seedHexSchema = z
  .string()
  .regex(/^0x[0-9a-f]{64}$/, 'Must be a 0x-prefixed 32-byte hex string')

/**
 * Tuple of the two Poseidon-hashable photo halves, each 0x + 16 bytes hex
 * (32 hex chars = 16 bytes, the canonical anoncitizen circuit shape).
 */
export const photoHalfHexSchema = z
  .string()
  .regex(/^0x[0-9a-f]{32}$/, 'Must be a 0x-prefixed 16-byte hex string')

export const photoHashTupleSchema = z.tuple([photoHalfHexSchema, photoHalfHexSchema])

/**
 * Server-fallback witness — the raw circuit inputs. NEVER logged. NEVER
 * persisted. Zeroed in memory once the prover returns.
 *
 * Strict mode: any extra field is rejected (the threat model treats
 * unknown fields as tampering — see identity-wiring.md §6).
 */
export const proveWitnessSchema = z
  .object({
    aadhaarNumber: aadhaarNumberSchema,
    seed: seedHexSchema,
    photoHash: photoHashTupleSchema,
  })
  .strict()

export type ProveWitness = z.infer<typeof proveWitnessSchema>

export const proveRequestSchema = z
  .object({
    witness: proveWitnessSchema,
  })
  .strict()

export type ProveRequest = z.infer<typeof proveRequestSchema>

/** Success response — `{ proof, publicSignals }` ready for `/identity/verify`. */
export const proveSuccessSchema = z.object({
  proof: groth16ProofSchema,
  publicSignals: verifyPublicSignalsSchema,
})

export type ProveSuccess = z.infer<typeof proveSuccessSchema>

/**
 * Typed prove-error codes — discriminated union surfaced by the route.
 *
 * Mapping (see `apps/api/src/routes/identity.ts`):
 *   - `PROOF_MALFORMED`     → 400 (Zod validation failed)
 *   - `CIRCUIT_CONSTRAINT`  → 400 (circuit rejected witness — bad Aadhaar checksum, etc.)
 *   - `PROVING_FAILED`      → 422 (prover ran but produced no proof)
 *   - `PROVER_NOT_CONFIGURED` → 503 (server prover not deployed)
 *   - `S1_COMPLAINT_SUBMIT_OFF` → 503 (feature flag off)
 *   - `RATE_LIMITED`        → 429 (per-IP token bucket exhausted)
 *   - `INTERNAL`            → 500 (unknown — body carries NO `err.message` to
 *                             prevent leaking Aadhaar bytes via stack)
 */
export const proveErrorCodeSchema = z.enum([
  'PROOF_MALFORMED',
  'CIRCUIT_CONSTRAINT',
  'PROVING_FAILED',
  'PROVER_NOT_CONFIGURED',
  'S1_COMPLAINT_SUBMIT_OFF',
  'RATE_LIMITED',
  'INTERNAL',
])

export type ProveErrorCode = z.infer<typeof proveErrorCodeSchema>

export const proveErrorSchema = z.object({
  code: proveErrorCodeSchema,
})

export type ProveError = z.infer<typeof proveErrorSchema>

/**
 * Response envelope:
 *   - 200 → `proveSuccessSchema` (`{ proof, publicSignals }`)
 *   - non-200 → `proveErrorSchema` (`{ code }`)
 *
 * We keep these as separate schemas (not a discriminated union) because
 * the HTTP status is the canonical discriminator — the route never returns
 * a `code: 'OK'` body, only the proof envelope on success.
 */
export type ProveResponse = ProveSuccess | ProveError

/**
 * Deterministic base32 handle derived from the nullifier.
 *
 * S2 plans to derive this via Poseidon for consistency with the circuit
 * (`aggregates.md` §Citizen `Handle`); for Phase 5 wave 1 we use a stable,
 * lowercase base32 slice of the nullifier — deterministic, collision-safe
 * at S1 scale, and trivially replaceable when Poseidon-derive lands.
 */
export const deriveHandle = (nullifier: Nullifier): string => {
  const raw = nullifier.slice(2) // drop `0x`
  // Take 10 hex chars → base16 → still readable in URLs and admin lists.
  // We intentionally don't include a checksum: this is a display handle,
  // never a security primitive (per ATID-IDENT-006).
  return `c_${raw.slice(0, 10)}`
}
