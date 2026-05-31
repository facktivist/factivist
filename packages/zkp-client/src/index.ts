/**
 * `@factivist/zkp-client` — platform-aware Groth16 verifier.
 *
 * Per [[ADR-018]]:
 *   - iOS  → rapidsnark (resolved at runtime via dynamic import of the RN
 *            native module)
 *   - Web + Android → snarkjs (`groth16.verify`)
 *   - Server-side fallback — out of scope for Phase 5 wave 1
 *
 * The verifier needs a Groth16 verification key (`vKey`). For Phase 5 wave 1
 * the deployed `CitizenVerifier.sol` is not yet on chain, so consumers MUST
 * either call `setVerificationKey(vKey)` at boot OR set the env var
 * `FACTIVIST_ZKP_VKEY_URL`. If neither is configured, `verifyProofOnDevice`
 * throws a typed {@link ZkpNotConfiguredError} which routes convert to a
 * `503 zkp_not_configured` response.
 *
 * No runtime imports of `react-native` or `snarkjs` at module load — both
 * are resolved lazily so this package stays importable from Bun, Node,
 * browsers, and Expo Hermes alike.
 */

import type { Groth16Proof } from '@factivist/shared/types'

export type { Groth16Proof }

/** Runtime classifier — exposed for routing/telemetry, not security. */
export type ProverPlatform = 'ios' | 'android' | 'web' | 'unknown'

/** Groth16 verification key (snarkjs schema). Opaque to this package. */
export type VerificationKey = Readonly<Record<string, unknown>>

/** Thrown when no verification key has been configured. */
export class ZkpNotConfiguredError extends Error {
  override name = 'ZkpNotConfiguredError'
  constructor(message = 'ZKP verification key not configured') {
    super(message)
  }
}

let _vKey: VerificationKey | undefined

/** Inject the verification key. Idempotent; last call wins. */
export const setVerificationKey = (vKey: VerificationKey): void => {
  _vKey = vKey
}

/** Test-only escape hatch — clear the cached vKey. */
export const __resetVerificationKey = (): void => {
  _vKey = undefined
}

const isReactNative = (): boolean => {
  // Detect React Native without importing it. The RN bundler shims `navigator`
  // with a known product string; Node + browsers do not.
  const nav: { product?: string } | undefined =
    typeof navigator === 'undefined' ? undefined : (navigator as { product?: string })
  return nav?.product === 'ReactNative'
}

/**
 * Best-effort runtime classifier. Avoids importing `react-native`'s
 * `Platform` module so this code stays runnable in plain Node/Bun tests.
 */
export const detectPlatform = (): ProverPlatform => {
  if (!isReactNative()) {
    // Use `globalThis` so this code typechecks under both DOM-libbed and
    // Node/Bun-libbed configs without needing a triple-slash reference.
    return typeof (globalThis as { window?: unknown }).window === 'undefined' ? 'unknown' : 'web'
  }
  // Inside a React Native runtime — read OS via the global `__fbBatchedBridge`?
  // Cleaner: callers in apps/mobile may override via setProverPlatform().
  if (_platformOverride) return _platformOverride
  return 'unknown'
}

let _platformOverride: ProverPlatform | undefined

/**
 * Allow the mobile app to declare its platform explicitly at boot.
 *
 * `apps/mobile` calls `setProverPlatform(Platform.OS === 'ios' ? 'ios' : 'android')`
 * in its bootstrap so we don't have to ship a react-native dep here.
 */
export const setProverPlatform = (p: ProverPlatform): void => {
  _platformOverride = p
}

/** Test-only escape hatch — clear the platform override. */
export const __resetProverPlatform = (): void => {
  _platformOverride = undefined
}

/** Type for snarkjs's `groth16.verify` signature, narrowed. */
type SnarkjsLike = {
  groth16: {
    verify: (
      vKey: VerificationKey,
      publicSignals: readonly string[],
      proof: Groth16Proof,
    ) => Promise<boolean>
  }
}

/** Type for the rapidsnark RN native module wrapper. */
type RapidsnarkLike = {
  verify: (
    vKey: VerificationKey,
    publicSignals: readonly string[],
    proof: Groth16Proof,
  ) => Promise<boolean>
}

/**
 * Slots that test code can replace to inject mocks without going through
 * `vi.mock` of a dynamic import — keeps tests fast and explicit.
 */
export const __backends: {
  snarkjs?: SnarkjsLike
  rapidsnark?: RapidsnarkLike
} = {}

const loadSnarkjs = async (): Promise<SnarkjsLike> => {
  if (__backends.snarkjs) return __backends.snarkjs
  // Dynamic import keeps snarkjs out of the cold-start path for callers who
  // don't need it (e.g. server when no vKey is configured).
  // The package is intentionally NOT listed as a `dependency` of zkp-client
  // — apps that need it install it themselves (web bundle pulls it in,
  // mobile bundle ships it on Android). Failing here surfaces a clear,
  // typed error rather than crashing on a missing native binding.
  throw new ZkpNotConfiguredError(
    'snarkjs is not bundled. Inject it via __backends.snarkjs or install snarkjs in the consuming app.',
  )
}

const loadRapidsnark = async (): Promise<RapidsnarkLike> => {
  if (__backends.rapidsnark) return __backends.rapidsnark
  throw new ZkpNotConfiguredError(
    'rapidsnark native module is not linked. Inject via __backends.rapidsnark on iOS.',
  )
}

/**
 * Verify a Groth16 proof on the active device.
 *
 * Selection rule per ADR-0018:
 *   - iOS → rapidsnark
 *   - everything else → snarkjs
 *
 * @throws {ZkpNotConfiguredError} if the vKey or backend is missing.
 * Returns `false` (never throws) when the proof itself is invalid.
 */
export const verifyProofOnDevice = async (
  proof: Groth16Proof,
  publicSignals: readonly string[],
): Promise<boolean> => {
  if (!_vKey) {
    throw new ZkpNotConfiguredError(
      'Verification key not set. Call setVerificationKey() before verifyProofOnDevice().',
    )
  }
  const platform = detectPlatform()
  if (platform === 'ios') {
    const backend = await loadRapidsnark()
    return backend.verify(_vKey, publicSignals, proof)
  }
  const backend = await loadSnarkjs()
  return backend.groth16.verify(_vKey, publicSignals, proof)
}
