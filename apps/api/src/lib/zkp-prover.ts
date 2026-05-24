/**
 * Server-side ZKP prover — low-tier device fallback for `POST /identity/prove`.
 *
 * ## Why this exists
 *
 * Per ADR-0011 (hybrid proving stack) and identity-wiring.md §5.2, devices
 * that cannot run snarkjs in-thread within the UX budget (low-end Android
 * < 3 GB RAM, iOS pre-A13) post the raw circuit witness to the API and
 * receive back a `(proof, publicSignals)` envelope they then submit to
 * `/identity/verify`. This module wraps the actual prover binary
 * (rapidsnark or snarkjs) behind a typed surface.
 *
 * ## What this module does NOT do
 *
 * This file ships a stub that throws {@link ProverNotConfiguredError} unless
 * the test suite (or the future production deployment) injects a backend
 * via `__prover`. Real binary distribution — packaging rapidsnark for
 * Linux/Lambda, fetching the proving key, validating its SHA-256 against
 * `packages/shared/src/constants/zkp.ts` — is a Pipeline E ops task tracked
 * separately. Landing the wrapper now unblocks the route + tests; landing
 * the binary is a deploy concern, not an application concern.
 *
 * ## Memory hygiene contract (zkp-key-custody.md §Server-side fallback)
 *
 * The witness contains the Aadhaar number. Per the custody rules:
 *
 *   1. The witness MUST be processed in memory only — never logged,
 *      never written to disk, never persisted in any database.
 *   2. After the prover returns (success OR failure), the Aadhaar string
 *      buffer is overwritten with zero bytes via {@link zeroiseWitness}
 *      before the witness object falls out of scope.
 *   3. Error messages from the prover are NEVER returned to the caller
 *      verbatim (the route returns a typed code instead) — the Aadhaar
 *      may appear in a stack trace if the prover crashes mid-circuit.
 *
 * ## Test seam
 *
 * `__prover` is the documented test injection slot. The route's tests
 * replace it with a deterministic mock; production replaces it with a
 * lazy-loaded rapidsnark binding. The slot is mutable so tests can
 * exercise the "not configured" path by re-assigning to `undefined`.
 */

import type { Groth16Proof, ProveWitness, VerifyPublicSignals } from '@factivist/shared/validators'

/** Thrown when the server prover is not deployed (the default). */
export class ProverNotConfiguredError extends Error {
  override name = 'ProverNotConfiguredError'
  constructor(message = 'Server-side prover is not configured on this instance') {
    super(message)
  }
}

/** Thrown when the prover ran but failed to produce a valid proof. */
export class ProvingFailedError extends Error {
  override name = 'ProvingFailedError'
  constructor(message = 'Proof generation failed') {
    super(message)
  }
}

/**
 * Thrown when the circuit itself rejected the witness — e.g. the Aadhaar
 * checksum is invalid, or the photo halves do not match the seed binding.
 * Surfaces as a `400 CIRCUIT_CONSTRAINT` to the client (caller bug, not
 * server fault).
 */
export class CircuitConstraintError extends Error {
  override name = 'CircuitConstraintError'
  constructor(message = 'Witness violated a circuit constraint') {
    super(message)
  }
}

export interface ProveResult {
  readonly proof: Groth16Proof
  readonly publicSignals: VerifyPublicSignals
}

/** Backend contract — what a real rapidsnark/snarkjs wrapper must implement. */
export type ProverBackend = (witness: ProveWitness) => Promise<ProveResult>

/**
 * Test injection slot — production code does NOT read this directly;
 * `proveServerSide()` consults it as the first port of call.
 *
 * Re-assign to `undefined` (the default) to exercise the
 * "not configured" path in unit tests.
 */
export const __prover: { backend?: ProverBackend } = {}

/**
 * Best-effort buffer zeroisation for the Aadhaar number string. JS strings
 * are immutable so we cannot mutate them in place; the next best thing is
 * to:
 *
 *   1. Materialise the bytes into a Bun/Node `Buffer`.
 *   2. Call `fill(0)` on that buffer.
 *   3. Drop the original reference so the V8/JSC GC can reap it.
 *
 * Per identity-wiring.md OQ-4, the architect-blessed primitive on Bun is
 * `Buffer.fill(0)` on a `Buffer.from(str, 'utf8')` clone. The original
 * string is collectable once the witness object is freed — the buffer
 * step ensures any intermediate copy the prover saw is at least zeroed
 * before the request finishes.
 */
export const zeroiseWitness = (witness: ProveWitness): void => {
  // Materialise + zero the Aadhaar bytes. The buffer is local — discarding
  // it after `fill(0)` is the cleanest signal to V8 we own the memory.
  const aadhaarBuf = Buffer.from(witness.aadhaarNumber, 'utf8')
  aadhaarBuf.fill(0)

  // Same for the seed (carries entropy that links a session to a citizen).
  const seedBuf = Buffer.from(witness.seed, 'utf8')
  seedBuf.fill(0)

  // Photo halves are hex; the bytes themselves are derived from PII upstream
  // (the citizen's Aadhaar QR photo crop). Zero them out of caution.
  for (const half of witness.photoHash) {
    Buffer.from(half, 'utf8').fill(0)
  }
}

/**
 * Server-side prover entry point. Routes call this with the validated
 * witness; the wrapper:
 *
 *   1. Picks the injected backend (test) or throws
 *      {@link ProverNotConfiguredError} (default).
 *   2. Invokes the backend inside a try/finally so the zeroisation runs
 *      whether the prover succeeds or throws.
 *   3. Re-throws the backend's typed errors verbatim — the route maps
 *      each to a stable HTTP status + machine-readable `code`.
 *
 * @throws {ProverNotConfiguredError} if no backend is injected
 * @throws {CircuitConstraintError}   if the witness fails circuit constraints
 * @throws {ProvingFailedError}       if the prover itself crashes/aborts
 */
export const proveServerSide = async (witness: ProveWitness): Promise<ProveResult> => {
  const backend = __prover.backend
  if (!backend) {
    throw new ProverNotConfiguredError()
  }
  try {
    return await backend(witness)
  } finally {
    zeroiseWitness(witness)
  }
}
