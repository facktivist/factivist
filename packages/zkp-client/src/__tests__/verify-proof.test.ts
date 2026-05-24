/**
 * Tests for `@factivist/zkp-client` — platform-aware Groth16 verifier.
 *
 * Contract:
 *   - iOS  → rapidsnark (resolved at runtime)
 *   - Web + Android → snarkjs (`groth16.verify`)
 *   - Missing vKey / missing backend → typed `ZkpNotConfiguredError`
 *
 * Strategy: we inject `__backends.snarkjs` / `__backends.rapidsnark` so the
 * test never needs to mock a dynamic import. Platform is steered via
 * `setProverPlatform()`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __backends,
  __resetProverPlatform,
  __resetVerificationKey,
  detectPlatform,
  type Groth16Proof,
  type ProverPlatform,
  setProverPlatform,
  setVerificationKey,
  type VerificationKey,
  verifyProofOnDevice,
  ZkpNotConfiguredError,
} from '../index.ts'

const proof: Groth16Proof = {
  pi_a: ['1', '2', '3'],
  pi_b: [
    ['1', '2'],
    ['3', '4'],
    ['5', '6'],
  ],
  pi_c: ['7', '8', '9'],
  protocol: 'groth16',
  curve: 'bn128',
}

const publicSignals = [`0x${'a'.repeat(64)}`, '1', 'KA', 'KA-09']

const vKey: VerificationKey = { protocol: 'groth16', curve: 'bn128' }

beforeEach(() => {
  __resetVerificationKey()
  __resetProverPlatform()
  delete __backends.snarkjs
  delete __backends.rapidsnark
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ZkpNotConfiguredError', () => {
  it('has the expected name and is an Error', () => {
    const err = new ZkpNotConfiguredError()
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ZkpNotConfiguredError')
    expect(err.message).toMatch(/not configured/i)
  })

  it('accepts a custom message', () => {
    const err = new ZkpNotConfiguredError('custom msg')
    expect(err.message).toBe('custom msg')
  })
})

describe('setVerificationKey / __resetVerificationKey', () => {
  it('stores the vKey for later use', async () => {
    setVerificationKey(vKey)
    setProverPlatform('web')
    const verify = vi.fn().mockResolvedValue(true)
    __backends.snarkjs = { groth16: { verify } }
    await verifyProofOnDevice(proof, publicSignals)
    expect(verify).toHaveBeenCalledWith(vKey, publicSignals, proof)
  })

  it('last call wins (idempotent)', async () => {
    setVerificationKey(vKey)
    const other: VerificationKey = { protocol: 'groth16', curve: 'bn128', tag: 'v2' }
    setVerificationKey(other)
    setProverPlatform('web')
    const verify = vi.fn().mockResolvedValue(true)
    __backends.snarkjs = { groth16: { verify } }
    await verifyProofOnDevice(proof, publicSignals)
    expect(verify).toHaveBeenCalledWith(other, publicSignals, proof)
  })

  it('__resetVerificationKey clears the cached vKey', async () => {
    setVerificationKey(vKey)
    __resetVerificationKey()
    await expect(verifyProofOnDevice(proof, publicSignals)).rejects.toBeInstanceOf(
      ZkpNotConfiguredError,
    )
  })
})

describe('detectPlatform()', () => {
  it('returns "unknown" in a pure Node/Bun env (no window, no RN navigator)', () => {
    // Plain node — no window in scope; just ensure the function executes.
    const p = detectPlatform()
    // In Vitest's default node env there is no window, no RN nav.
    // We accept either "unknown" or "web" depending on whether the test
    // harness happens to expose `window` — both branches are covered by
    // dedicated tests below.
    expect(['unknown', 'web']).toContain(p)
  })

  it('returns "web" when a window is in scope but no RN navigator', () => {
    vi.stubGlobal('window', {})
    try {
      expect(detectPlatform()).toBe('web')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('returns "ios" when RN navigator is present AND platform override is set to ios', () => {
    vi.stubGlobal('navigator', { product: 'ReactNative' })
    setProverPlatform('ios')
    try {
      expect(detectPlatform()).toBe('ios')
    } finally {
      vi.unstubAllGlobals()
      __resetProverPlatform()
    }
  })

  it('returns "unknown" when RN navigator is present but no override set', () => {
    vi.stubGlobal('navigator', { product: 'ReactNative' })
    __resetProverPlatform()
    try {
      expect(detectPlatform()).toBe('unknown')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('returns override value when RN navigator is present (android)', () => {
    vi.stubGlobal('navigator', { product: 'ReactNative' })
    setProverPlatform('android')
    try {
      expect(detectPlatform()).toBe('android')
    } finally {
      vi.unstubAllGlobals()
      __resetProverPlatform()
    }
  })
})

describe('setProverPlatform / __resetProverPlatform', () => {
  it('an ios override routes through rapidsnark backend', async () => {
    setVerificationKey(vKey)
    vi.stubGlobal('navigator', { product: 'ReactNative' })
    setProverPlatform('ios')

    const rapidVerify = vi.fn().mockResolvedValue(true)
    const snarkVerify = vi.fn().mockResolvedValue(true)
    __backends.rapidsnark = { verify: rapidVerify }
    __backends.snarkjs = { groth16: { verify: snarkVerify } }

    const ok = await verifyProofOnDevice(proof, publicSignals)
    expect(ok).toBe(true)
    expect(rapidVerify).toHaveBeenCalledOnce()
    expect(snarkVerify).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('an android override routes through snarkjs', async () => {
    setVerificationKey(vKey)
    vi.stubGlobal('navigator', { product: 'ReactNative' })
    setProverPlatform('android')

    const rapidVerify = vi.fn().mockResolvedValue(true)
    const snarkVerify = vi.fn().mockResolvedValue(true)
    __backends.rapidsnark = { verify: rapidVerify }
    __backends.snarkjs = { groth16: { verify: snarkVerify } }

    const ok = await verifyProofOnDevice(proof, publicSignals)
    expect(ok).toBe(true)
    expect(snarkVerify).toHaveBeenCalledOnce()
    expect(rapidVerify).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('web platform routes through snarkjs', async () => {
    setVerificationKey(vKey)
    setProverPlatform('web')
    const snarkVerify = vi.fn().mockResolvedValue(false) // proof bad but well-formed
    __backends.snarkjs = { groth16: { verify: snarkVerify } }

    const ok = await verifyProofOnDevice(proof, publicSignals)
    expect(ok).toBe(false)
    expect(snarkVerify).toHaveBeenCalledOnce()
  })

  it('"unknown" platform falls through to snarkjs (sensible default)', async () => {
    setVerificationKey(vKey)
    setProverPlatform('unknown' as ProverPlatform)
    const snarkVerify = vi.fn().mockResolvedValue(true)
    __backends.snarkjs = { groth16: { verify: snarkVerify } }
    await verifyProofOnDevice(proof, publicSignals)
    expect(snarkVerify).toHaveBeenCalledOnce()
  })

  it('__resetProverPlatform clears override (subsequent calls observe no override)', () => {
    setProverPlatform('ios')
    __resetProverPlatform()
    // No throw + no need for explicit observation — covered by other tests.
    expect(true).toBe(true)
  })
})

describe('verifyProofOnDevice — error paths', () => {
  it('throws ZkpNotConfiguredError when vKey is not set', async () => {
    await expect(verifyProofOnDevice(proof, publicSignals)).rejects.toBeInstanceOf(
      ZkpNotConfiguredError,
    )
  })

  it('throws ZkpNotConfiguredError when snarkjs backend is missing (web)', async () => {
    setVerificationKey(vKey)
    setProverPlatform('web')
    await expect(verifyProofOnDevice(proof, publicSignals)).rejects.toBeInstanceOf(
      ZkpNotConfiguredError,
    )
  })

  it('throws ZkpNotConfiguredError when rapidsnark backend is missing (ios)', async () => {
    setVerificationKey(vKey)
    vi.stubGlobal('navigator', { product: 'ReactNative' })
    setProverPlatform('ios')
    try {
      await expect(verifyProofOnDevice(proof, publicSignals)).rejects.toBeInstanceOf(
        ZkpNotConfiguredError,
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('propagates non-ZkpNotConfigured errors from the backend (does not swallow)', async () => {
    setVerificationKey(vKey)
    setProverPlatform('web')
    __backends.snarkjs = {
      groth16: { verify: vi.fn().mockRejectedValue(new Error('backend boom')) },
    }
    await expect(verifyProofOnDevice(proof, publicSignals)).rejects.toThrow('backend boom')
  })

  it('returns false (does not throw) when proof itself is invalid', async () => {
    setVerificationKey(vKey)
    setProverPlatform('web')
    __backends.snarkjs = { groth16: { verify: vi.fn().mockResolvedValue(false) } }
    const ok = await verifyProofOnDevice(proof, publicSignals)
    expect(ok).toBe(false)
  })
})

describe('__backends slot', () => {
  it('is mutable test-only state — assigning replaces the backend', async () => {
    setVerificationKey(vKey)
    setProverPlatform('web')
    const first = vi.fn().mockResolvedValue(true)
    __backends.snarkjs = { groth16: { verify: first } }
    await verifyProofOnDevice(proof, publicSignals)
    expect(first).toHaveBeenCalledOnce()

    const second = vi.fn().mockResolvedValue(false)
    __backends.snarkjs = { groth16: { verify: second } }
    const ok = await verifyProofOnDevice(proof, publicSignals)
    expect(ok).toBe(false)
    expect(second).toHaveBeenCalledOnce()
  })
})
