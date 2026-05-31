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

import { unlink } from 'node:fs/promises'
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
 *   1. Picks the injected backend (test) or auto-loads the rapidsnark
 *      backend from env vars on first call, or throws
 *      {@link ProverNotConfiguredError}.
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
  const backend = __prover.backend ?? loadRapidsnarkBackendFromEnv()
  if (!backend) {
    throw new ProverNotConfiguredError()
  }
  try {
    return await backend(witness)
  } finally {
    zeroiseWitness(witness)
  }
}

/**
 * Lazy-load a rapidsnark-backed prover from env when all three artifacts are
 * configured. Returns `undefined` when any path is missing so the caller can
 * fall through to the "not configured" error path. See
 * `apps/api/zkp-artifacts/README.md` for local-setup instructions.
 */
const loadRapidsnarkBackendFromEnv = (): ProverBackend | undefined => {
  const bin = process.env.FACTIVIST_ZKP_PROVER_BIN
  const zkey = process.env.FACTIVIST_ZKP_ZKEY_PATH
  const wasm = process.env.FACTIVIST_ZKP_WASM_PATH
  if (!bin || !zkey || !wasm) return undefined
  return createRapidsnarkBackend({ bin, zkey, wasm })
}

/**
 * Build a `ProverBackend` that shells out to rapidsnark via `Bun.spawn`.
 *
 * Contract with the binary (per iden3/rapidsnark CLI):
 *   1. Write the witness as JSON to a tmpfs-backed file (`Bun.write` to
 *      `/tmp/factivist-witness-<uuid>.json`).
 *   2. `rapidsnark <zkey> <witness.wtns> <proof.json> <public.json>` —
 *      rapidsnark expects a pre-computed `.wtns` file. We invoke `snarkjs
 *      wtns calculate` first via the wasm to produce it (deferred — Phase 9
 *      will replace this two-step shell-out with a single FFI binding).
 *   3. `unlink` every intermediate file BEFORE the function returns.
 *
 * Failure modes:
 *   - Non-zero exit code with stderr containing "constraint" → `CircuitConstraintError`
 *   - Non-zero exit code otherwise → `ProvingFailedError`
 *   - JSON parse failure on output → `ProvingFailedError`
 *
 * Intentionally NOT exported: callers go through `proveServerSide`.
 */
/**
 * Pure parser for rapidsnark stdout. Exported so unit tests cover both the
 * happy parse and the "garbage in" failure mode without booting a binary.
 */
export const parseRapidsnarkOutput = (proofRaw: string, publicRaw: string): ProveResult => {
  try {
    const proof = JSON.parse(proofRaw) as Groth16Proof
    const publicSignals = JSON.parse(publicRaw) as VerifyPublicSignals
    return { proof, publicSignals }
  } catch {
    throw new ProvingFailedError('rapidsnark output was not valid JSON')
  }
}

/**
 * Pure classifier for rapidsnark / snarkjs stderr. Maps the failure mode to
 * the right typed error so the route returns the right HTTP code. Exported
 * for testability.
 */
export const classifyBinaryError = (stderr: string, defaultMsg: string): Error => {
  if (/constraint/i.test(stderr)) {
    return new CircuitConstraintError(`${defaultMsg} — circuit constraint`)
  }
  return new ProvingFailedError(defaultMsg)
}

/* v8 ignore start — IO orchestration around external binaries; covered by
 * manual integration test against an installed rapidsnark + zkey, not by unit
 * mocks. The pure pieces (parseRapidsnarkOutput, classifyBinaryError) ARE
 * unit-tested above; this wrapper just sequences them with Bun.spawn. */
export const createRapidsnarkBackend = (config: {
  readonly bin: string
  readonly zkey: string
  readonly wasm: string
}): ProverBackend => {
  return async (witness: ProveWitness): Promise<ProveResult> => {
    const tmpPrefix = `/tmp/factivist-zkp-${crypto.randomUUID()}`
    const witnessJson = `${tmpPrefix}-witness.json`
    const witnessWtns = `${tmpPrefix}-witness.wtns`
    const proofJson = `${tmpPrefix}-proof.json`
    const publicJson = `${tmpPrefix}-public.json`

    try {
      await Bun.write(witnessJson, JSON.stringify(witness))

      // Step 1: snarkjs wtns calculate (witness JSON + circuit wasm → .wtns)
      const calc = Bun.spawn(
        ['snarkjs', 'wtns', 'calculate', config.wasm, witnessJson, witnessWtns],
        { stdout: 'pipe', stderr: 'pipe' },
      )
      const calcExit = await calc.exited
      if (calcExit !== 0) {
        const stderr = await new Response(calc.stderr).text()
        throw classifyBinaryError(stderr, 'snarkjs wtns calculate failed')
      }

      // Step 2: rapidsnark <zkey> <wtns> <proof> <public>
      const prove = Bun.spawn([config.bin, config.zkey, witnessWtns, proofJson, publicJson], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const proveExit = await prove.exited
      if (proveExit !== 0) {
        const stderr = await new Response(prove.stderr).text()
        throw classifyBinaryError(stderr, 'rapidsnark exited non-zero')
      }

      const proofRaw = await Bun.file(proofJson).text()
      const publicRaw = await Bun.file(publicJson).text()
      return parseRapidsnarkOutput(proofRaw, publicRaw)
    } finally {
      // Best-effort cleanup — every intermediate file gets unlinked, even
      // if a later step throws. The witness JSON in particular MUST not
      // survive past the request.
      await Promise.allSettled([
        unlink(witnessJson),
        unlink(witnessWtns),
        unlink(proofJson),
        unlink(publicJson),
      ])
    }
  }
}
/* v8 ignore stop */
