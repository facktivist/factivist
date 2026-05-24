/**
 * Unit tests for scripts/polygon-gas/measure-verify.ts
 *
 * Network-isolated: every test stubs the I/O layer via dependency injection.
 * No live RPC, no live oracle, no live filesystem read.
 */

import type { Address, PublicClient } from 'viem'
import { describe, expect, it } from 'vitest'
import {
  computeUsdPerVerify,
  effectiveGasPrice,
  measureVerify,
  type PolygonGasOracleV2,
  type ProofFixture,
  parseArgs,
  pickOracleScenario,
  resolveChain,
  VERIFIER_ABI,
  validateProofFixture,
} from '../measure-verify'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_PROOF: ProofFixture = {
  pA: ['0x01', '0x02'],
  pB: [
    ['0x03', '0x04'],
    ['0x05', '0x06'],
  ],
  pC: ['0x07', '0x08'],
  pubSignals: ['0x09', '0x0a', '0x0b', '0x0c', '0x0d', '0x0e', '0x0f', '0x10', '0x11'],
}

const ORACLE_SNAPSHOT: PolygonGasOracleV2 = {
  safeLow: { maxPriorityFee: 45.82, maxFee: 293.74 },
  standard: { maxPriorityFee: 89.91, maxFee: 337.83 },
  fast: { maxPriorityFee: 178.25, maxFee: 426.17 },
  estimatedBaseFee: 247.92,
  blockTime: 1.67,
  blockNumber: 87_305_212,
}

// ─── computeUsdPerVerify ─────────────────────────────────────────────────────

describe('computeUsdPerVerify', () => {
  it('computes USD cost for a typical post-Chicago verify', () => {
    // 487_242 gas × 337.83 gwei × $0.087677 / POL = ~$0.0144
    const usd = computeUsdPerVerify(487_242n, 337.83, 0.087677)
    expect(usd).toBeGreaterThan(0.014)
    expect(usd).toBeLessThan(0.015)
  })

  it('returns 0 when gas is 0', () => {
    expect(computeUsdPerVerify(0n, 100, 0.1)).toBe(0)
  })

  it('returns 0 when gas price is 0', () => {
    expect(computeUsdPerVerify(500_000n, 0, 0.1)).toBe(0)
  })

  it('returns 0 when POL/USD is 0', () => {
    expect(computeUsdPerVerify(500_000n, 100, 0)).toBe(0)
  })

  it('rejects negative gas', () => {
    expect(() => computeUsdPerVerify(-1n, 100, 0.1)).toThrow(/gas/)
  })

  it('rejects negative gas price', () => {
    expect(() => computeUsdPerVerify(1_000n, -1, 0.1)).toThrow(/gasPrice/)
  })

  it('rejects negative POL price', () => {
    expect(() => computeUsdPerVerify(1_000n, 100, -1)).toThrow(/polUsd/)
  })

  it('scales linearly with gas', () => {
    const a = computeUsdPerVerify(100_000n, 50, 0.1)
    const b = computeUsdPerVerify(200_000n, 50, 0.1)
    expect(b / a).toBeCloseTo(2, 6)
  })
})

// ─── pickOracleScenario ──────────────────────────────────────────────────────

describe('pickOracleScenario', () => {
  it('defaults to standard tier maxFee', () => {
    expect(pickOracleScenario(ORACLE_SNAPSHOT)).toBe(337.83)
  })

  it('returns safeLow maxFee when requested', () => {
    expect(pickOracleScenario(ORACLE_SNAPSHOT, 'safeLow')).toBe(293.74)
  })

  it('returns fast maxFee when requested', () => {
    expect(pickOracleScenario(ORACLE_SNAPSHOT, 'fast')).toBe(426.17)
  })

  it('throws on malformed oracle payload', () => {
    expect(() => pickOracleScenario({} as unknown as PolygonGasOracleV2)).toThrow(/Invalid oracle/)
  })
})

// ─── effectiveGasPrice ───────────────────────────────────────────────────────

describe('effectiveGasPrice', () => {
  it('caps at maxFee when base + tip exceeds it', () => {
    expect(effectiveGasPrice(300, 100, 350)).toBe(350)
  })

  it('uses base + tip when below maxFee', () => {
    expect(effectiveGasPrice(100, 50, 500)).toBe(150)
  })

  it('handles zero priority fee', () => {
    expect(effectiveGasPrice(200, 0, 500)).toBe(200)
  })
})

// ─── resolveChain ────────────────────────────────────────────────────────────

describe('resolveChain', () => {
  it('resolves Polygon mainnet (137)', () => {
    const r = resolveChain(137)
    expect(r).not.toBeNull()
    expect(r?.id).toBe(137)
    expect(r?.name.toLowerCase()).toContain('polygon')
  })

  it('resolves Polygon Amoy (80002)', () => {
    const r = resolveChain(80002)
    expect(r).not.toBeNull()
    expect(r?.id).toBe(80002)
  })

  it('returns null for unknown chainId', () => {
    expect(resolveChain(99_999)).toBeNull()
  })
})

// ─── validateProofFixture ────────────────────────────────────────────────────

describe('validateProofFixture', () => {
  it('accepts a valid fixture', () => {
    expect(validateProofFixture(VALID_PROOF)).toEqual(VALID_PROOF)
  })

  it('rejects null', () => {
    expect(() => validateProofFixture(null)).toThrow(/object/)
  })

  it('rejects non-object', () => {
    expect(() => validateProofFixture('not-an-object')).toThrow(/object/)
  })

  it('rejects bad pA length', () => {
    const bad = { ...VALID_PROOF, pA: ['0x01'] }
    expect(() => validateProofFixture(bad)).toThrow(/pA/)
  })

  it('rejects bad pB length', () => {
    const bad = { ...VALID_PROOF, pB: [['0x01', '0x02']] }
    expect(() => validateProofFixture(bad)).toThrow(/pB/)
  })

  it('rejects bad pC length', () => {
    const bad = { ...VALID_PROOF, pC: ['0x01', '0x02', '0x03'] }
    expect(() => validateProofFixture(bad)).toThrow(/pC/)
  })

  it('rejects wrong number of public signals', () => {
    const bad = { ...VALID_PROOF, pubSignals: ['0x01'] }
    expect(() => validateProofFixture(bad)).toThrow(/pubSignals.*9/)
  })
})

// ─── parseArgs ───────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('parses required flags', () => {
    const args = parseArgs([
      '--rpc',
      'https://rpc-amoy.polygon.technology',
      '--verifier',
      '0x0000000000000000000000000000000000000001',
      '--proof',
      'fixtures/sample.json',
      '--pol-usd',
      '0.087677',
    ])
    expect(args.rpc).toBe('https://rpc-amoy.polygon.technology')
    expect(args.verifier).toBe('0x0000000000000000000000000000000000000001')
    expect(args.proofPath).toBe('fixtures/sample.json')
    expect(args.polUsd).toBeCloseTo(0.087677, 6)
  })

  it('throws when --rpc missing', () => {
    expect(() => parseArgs(['--verifier', '0x1', '--proof', 'a', '--pol-usd', '0.1'])).toThrow(
      /usage/,
    )
  })

  it('throws on non-numeric --pol-usd', () => {
    expect(() =>
      parseArgs(['--rpc', 'x', '--verifier', '0x1', '--proof', 'a', '--pol-usd', 'NaN']),
    ).toThrow(/pol-usd/)
  })

  it('throws on negative --pol-usd', () => {
    expect(() =>
      parseArgs(['--rpc', 'x', '--verifier', '0x1', '--proof', 'a', '--pol-usd', '-0.5']),
    ).toThrow(/pol-usd/)
  })
})

// ─── ABI ─────────────────────────────────────────────────────────────────────

describe('VERIFIER_ABI', () => {
  it('exposes verifyProof view fn with 9 public signals', () => {
    const fn = VERIFIER_ABI.find((entry) => entry.name === 'verifyProof')
    expect(fn).toBeDefined()
    expect(fn?.stateMutability).toBe('view')
    const pubSignals = fn?.inputs.find((i) => i.name === '_pubSignals')
    expect(pubSignals?.type).toBe('uint256[9]')
  })
})

// ─── measureVerify (orchestrator) ────────────────────────────────────────────

describe('measureVerify', () => {
  it('orchestrates fetch + estimate + USD computation', async () => {
    const fakeClient = {
      getChainId: async () => 80002,
    } as unknown as PublicClient

    const result = await measureVerify(
      {
        rpc: 'https://fake',
        verifier: '0x0000000000000000000000000000000000000001' as Address,
        proofPath: 'unused.json',
        polUsd: 0.087677,
      },
      {
        readProof: async () => VALID_PROOF,
        fetchOracle: async () => ORACLE_SNAPSHOT,
        estimateGas: async () => 487_242n,
        makeClient: () => fakeClient,
      },
    )

    expect(result.chainId).toBe(80002)
    expect(result.chainName.toLowerCase()).toContain('amoy')
    expect(result.gas).toBe(487_242n)
    expect(result.gasPriceGwei).toBe(337.83)
    expect(result.oracleScenario).toBe('standard')
    expect(result.polUsd).toBe(0.087677)
    expect(result.usdPerVerify).toBeGreaterThan(0.014)
    expect(result.usdPerVerify).toBeLessThan(0.015)
    expect(result.oracle).toEqual(ORACLE_SNAPSHOT)
    expect(result.measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('falls back to chainId-only name for unknown chains', async () => {
    const fakeClient = {
      getChainId: async () => 4242,
    } as unknown as PublicClient

    const result = await measureVerify(
      {
        rpc: 'https://fake',
        verifier: '0x0000000000000000000000000000000000000002' as Address,
        proofPath: 'unused.json',
        polUsd: 0.1,
      },
      {
        readProof: async () => VALID_PROOF,
        fetchOracle: async () => ORACLE_SNAPSHOT,
        estimateGas: async () => 500_000n,
        makeClient: () => fakeClient,
      },
    )

    expect(result.chainName).toBe('chainId:4242')
  })

  it('propagates invalid-proof errors before any RPC call', async () => {
    let estimateCalled = false
    let oracleCalled = false
    await expect(
      measureVerify(
        {
          rpc: 'https://fake',
          verifier: '0x0000000000000000000000000000000000000001' as Address,
          proofPath: 'bad.json',
          polUsd: 0.1,
        },
        {
          readProof: async () => ({ pA: ['0x01'] }),
          fetchOracle: async () => {
            oracleCalled = true
            return ORACLE_SNAPSHOT
          },
          estimateGas: async () => {
            estimateCalled = true
            return 0n
          },
          makeClient: () => ({ getChainId: async () => 137 }) as unknown as PublicClient,
        },
      ),
    ).rejects.toThrow(/pA/)
    expect(estimateCalled).toBe(false)
    expect(oracleCalled).toBe(false)
  })

  it('respects an explicit chainId override (no RPC call needed)', async () => {
    let getChainIdCalled = false
    const fakeClient = {
      getChainId: async () => {
        getChainIdCalled = true
        return 1
      },
    } as unknown as PublicClient

    const result = await measureVerify(
      {
        rpc: 'https://fake',
        verifier: '0x0000000000000000000000000000000000000001' as Address,
        proofPath: 'unused.json',
        polUsd: 0.1,
        chainId: 137,
      },
      {
        readProof: async () => VALID_PROOF,
        fetchOracle: async () => ORACLE_SNAPSHOT,
        estimateGas: async () => 500_000n,
        makeClient: () => fakeClient,
      },
    )

    expect(result.chainId).toBe(137)
    expect(getChainIdCalled).toBe(false)
  })
})
