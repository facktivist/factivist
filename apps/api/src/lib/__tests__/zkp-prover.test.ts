/**
 * Unit tests for the server-side ZKP prover wrapper.
 *
 * The wrapper itself is intentionally thin — these tests pin its
 * contract:
 *
 *   - default state (no backend injected) throws ProverNotConfiguredError
 *   - typed errors from the backend propagate verbatim
 *   - the witness is zeroised after every call (success OR failure)
 *
 * We use a fake Aadhaar (`999999999999`) per the project's PII rule —
 * `aidefence_has_pii` MUST return `hasPII: false` on every fixture.
 */

import type { ProveWitness } from '@factivist/shared/validators'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  __prover,
  CircuitConstraintError,
  ProverNotConfiguredError,
  ProvingFailedError,
  proveServerSide,
  zeroiseWitness,
} from '../zkp-prover.ts'

const buildWitness = (): ProveWitness => ({
  aadhaarNumber: '999999999999', // fake — never a real Aadhaar
  seed: `0x${'1'.repeat(64)}`,
  photoHash: [`0x${'2'.repeat(32)}`, `0x${'3'.repeat(32)}`],
})

const SAMPLE_RESULT = {
  proof: {
    pi_a: ['1', '2', '3'],
    pi_b: [
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
    ],
    pi_c: ['7', '8', '9'],
    protocol: 'groth16',
    curve: 'bn128',
  },
  publicSignals: [`0x${'a'.repeat(64)}`, '1700000000', 'KA', 'KA-09'],
  // biome-ignore lint/suspicious/noExplicitAny: typed via the function return — this is a fixture
} as any

beforeEach(() => {
  __prover.backend = undefined
})

afterEach(() => {
  __prover.backend = undefined
  vi.restoreAllMocks()
})

describe('proveServerSide — default state', () => {
  it('throws ProverNotConfiguredError when no backend is injected', async () => {
    await expect(proveServerSide(buildWitness())).rejects.toBeInstanceOf(ProverNotConfiguredError)
  })
})

describe('proveServerSide — backend invocation', () => {
  it('forwards the witness to the injected backend and returns its result', async () => {
    const backend = vi.fn(async () => SAMPLE_RESULT)
    __prover.backend = backend
    const witness = buildWitness()
    const result = await proveServerSide(witness)
    expect(backend).toHaveBeenCalledOnce()
    expect(backend).toHaveBeenCalledWith(witness)
    expect(result).toBe(SAMPLE_RESULT)
  })

  it('re-throws CircuitConstraintError verbatim', async () => {
    __prover.backend = vi.fn(async () => {
      throw new CircuitConstraintError('bad aadhaar checksum')
    })
    await expect(proveServerSide(buildWitness())).rejects.toBeInstanceOf(CircuitConstraintError)
  })

  it('re-throws ProvingFailedError verbatim', async () => {
    __prover.backend = vi.fn(async () => {
      throw new ProvingFailedError('prover died')
    })
    await expect(proveServerSide(buildWitness())).rejects.toBeInstanceOf(ProvingFailedError)
  })

  it('re-throws generic Error untouched (route maps to 500)', async () => {
    __prover.backend = vi.fn(async () => {
      throw new Error('boom')
    })
    await expect(proveServerSide(buildWitness())).rejects.toThrow('boom')
  })
})

describe('zeroiseWitness', () => {
  it('runs without throwing on a valid witness', () => {
    // Best-effort zeroisation: JS strings are immutable so we cannot
    // observe the wipe directly. The contract is "no error, no side
    // effect outside the witness object" — this test pins both.
    const witness = buildWitness()
    expect(() => zeroiseWitness(witness)).not.toThrow()
    // The witness object itself is unchanged (strings can't mutate).
    expect(witness.aadhaarNumber).toBe('999999999999')
  })
})

describe('proveServerSide — zeroisation runs even on failure', () => {
  it('zeroises after a backend success', async () => {
    const witness = buildWitness()
    const zeroSpy = vi.spyOn(Buffer.prototype, 'fill')
    __prover.backend = vi.fn(async () => SAMPLE_RESULT)
    await proveServerSide(witness)
    // At least 4 fill calls: aadhaar, seed, two photo halves.
    expect(zeroSpy.mock.calls.length).toBeGreaterThanOrEqual(4)
    // Every fill call must be with 0.
    for (const call of zeroSpy.mock.calls) {
      expect(call[0]).toBe(0)
    }
  })

  it('zeroises after a backend failure (try/finally invariant)', async () => {
    const witness = buildWitness()
    const zeroSpy = vi.spyOn(Buffer.prototype, 'fill')
    __prover.backend = vi.fn(async () => {
      throw new ProvingFailedError('nope')
    })
    await expect(proveServerSide(witness)).rejects.toBeInstanceOf(ProvingFailedError)
    expect(zeroSpy.mock.calls.length).toBeGreaterThanOrEqual(4)
  })
})
