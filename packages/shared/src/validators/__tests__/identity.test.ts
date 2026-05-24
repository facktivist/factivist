/**
 * Golden tests for the identity Zod schemas.
 *
 * Source: `packages/shared/src/validators/identity.ts`.
 * Contract: `docs/architecture/phase-5/identity-contract.md` §3.
 *
 * Covers:
 *  - nullifierSchema branded type + lowercase coercion + regex
 *  - state/district code branded types + uppercase coercion
 *  - groth16ProofSchema accept/reject (malformed inputs)
 *  - verifyPublicSignalsSchema (length-4 tuple)
 *  - verifyProofRequestSchema (sessionNonce length bounds)
 *  - verifyProofResponseSchema discriminated union narrowing
 *  - sessionStatusSchema (nullable fields)
 *  - deriveHandle determinism
 */
import { describe, expect, it } from 'vitest'

import {
  citizenPublicViewSchema,
  deriveHandle,
  districtCodeSchema,
  groth16ProofSchema,
  type Nullifier,
  nullifierSchema,
  sessionStatusSchema,
  stateCodeSchema,
  verifyProofErrorSchema,
  verifyProofRequestSchema,
  verifyProofResponseSchema,
  verifyProofSuccessSchema,
  verifyPublicSignalsSchema,
} from '../identity.ts'

const VALID_NULLIFIER = `0x${'a'.repeat(64)}`

const validProof = {
  pi_a: ['1', '2', '3'] as [string, string, string],
  pi_b: [
    ['1', '2'],
    ['3', '4'],
    ['5', '6'],
  ] as [[string, string], [string, string], [string, string]],
  pi_c: ['7', '8', '9'] as [string, string, string],
  protocol: 'groth16' as const,
  curve: 'bn128' as const,
}

const validPublicSignals = [VALID_NULLIFIER, '1234567890', 'ka', 'ka-09'] as const

describe('nullifierSchema', () => {
  it('accepts a 0x-prefixed 64-hex-char string', () => {
    const out = nullifierSchema.parse(VALID_NULLIFIER)
    expect(out).toBe(VALID_NULLIFIER)
  })

  it('lowercases mixed-case hex before validating', () => {
    const mixed = `0x${'A'.repeat(64)}`
    const out = nullifierSchema.parse(mixed)
    expect(out).toBe(mixed.toLowerCase())
  })

  it('rejects missing 0x prefix', () => {
    expect(nullifierSchema.safeParse('a'.repeat(64)).success).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(nullifierSchema.safeParse(`0x${'a'.repeat(63)}`).success).toBe(false)
    expect(nullifierSchema.safeParse(`0x${'a'.repeat(65)}`).success).toBe(false)
  })

  it('rejects non-hex characters', () => {
    expect(nullifierSchema.safeParse(`0x${'z'.repeat(64)}`).success).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(nullifierSchema.safeParse(123).success).toBe(false)
    expect(nullifierSchema.safeParse(null).success).toBe(false)
    expect(nullifierSchema.safeParse(undefined).success).toBe(false)
  })

  it('produces a branded `Nullifier` type usable in type-narrowed APIs', () => {
    const parsed = nullifierSchema.parse(VALID_NULLIFIER)
    // Compile-time discrimination: assignment must round-trip.
    const branded: Nullifier = parsed
    expect(branded).toBe(VALID_NULLIFIER)
  })
})

describe('stateCodeSchema', () => {
  it('accepts 2-letter uppercased', () => {
    expect(stateCodeSchema.parse('KA')).toBe('KA')
  })

  it('uppercases lowercase input', () => {
    expect(stateCodeSchema.parse('ka')).toBe('KA')
  })

  it('rejects 3-letter codes', () => {
    expect(stateCodeSchema.safeParse('KAR').success).toBe(false)
  })

  it('rejects digits', () => {
    expect(stateCodeSchema.safeParse('K1').success).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(stateCodeSchema.safeParse(99).success).toBe(false)
  })
})

describe('districtCodeSchema', () => {
  it('accepts `KA-9` (1-digit seq)', () => {
    expect(districtCodeSchema.parse('KA-9')).toBe('KA-9')
  })

  it('accepts `KA-1234` (4-digit seq)', () => {
    expect(districtCodeSchema.parse('KA-1234')).toBe('KA-1234')
  })

  it('uppercases lowercase state prefix', () => {
    expect(districtCodeSchema.parse('ka-09')).toBe('KA-09')
  })

  it('rejects missing seq', () => {
    expect(districtCodeSchema.safeParse('KA-').success).toBe(false)
  })

  it('rejects seq longer than 4 digits', () => {
    expect(districtCodeSchema.safeParse('KA-12345').success).toBe(false)
  })

  it('rejects non-string', () => {
    expect(districtCodeSchema.safeParse(42).success).toBe(false)
  })
})

describe('groth16ProofSchema', () => {
  it('accepts a well-shaped proof envelope', () => {
    const out = groth16ProofSchema.parse(validProof)
    expect(out.protocol).toBe('groth16')
    expect(out.curve).toBe('bn128')
  })

  it('rejects when pi_a is not a 3-tuple', () => {
    const bad = { ...validProof, pi_a: ['1', '2'] }
    expect(groth16ProofSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects when pi_b inner is not a 2-tuple', () => {
    const bad = { ...validProof, pi_b: [['1'], ['3', '4'], ['5', '6']] }
    expect(groth16ProofSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects when pi_c is missing', () => {
    const { pi_c: _, ...rest } = validProof
    expect(groth16ProofSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects non-decimal strings in coordinates', () => {
    const bad = { ...validProof, pi_a: ['0xff', '2', '3'] }
    expect(groth16ProofSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects unknown protocols', () => {
    const bad = { ...validProof, protocol: 'plonk' }
    expect(groth16ProofSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects unknown curves', () => {
    const bad = { ...validProof, curve: 'bls12-381' }
    expect(groth16ProofSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects entirely non-object input', () => {
    expect(groth16ProofSchema.safeParse('not a proof').success).toBe(false)
    expect(groth16ProofSchema.safeParse(null).success).toBe(false)
  })
})

describe('verifyPublicSignalsSchema', () => {
  it('parses a valid 4-tuple', () => {
    const out = verifyPublicSignalsSchema.parse([...validPublicSignals])
    expect(out[0]).toBe(VALID_NULLIFIER)
    expect(out[1]).toBe('1234567890')
    expect(out[2]).toBe('KA')
    expect(out[3]).toBe('KA-09')
  })

  it('rejects a 3-tuple (missing district)', () => {
    expect(verifyPublicSignalsSchema.safeParse(validPublicSignals.slice(0, 3)).success).toBe(false)
  })

  it('rejects non-decimal epoch', () => {
    const bad = [VALID_NULLIFIER, '1.5', 'KA', 'KA-09']
    expect(verifyPublicSignalsSchema.safeParse(bad).success).toBe(false)
  })
})

describe('verifyProofRequestSchema', () => {
  const validBody = {
    proof: validProof,
    publicSignals: [...validPublicSignals],
    sessionNonce: 'a'.repeat(32),
  }

  it('accepts a fully-valid request', () => {
    const out = verifyProofRequestSchema.parse(validBody)
    expect(out.sessionNonce).toHaveLength(32)
  })

  it('rejects a sessionNonce shorter than 16 chars', () => {
    expect(
      verifyProofRequestSchema.safeParse({ ...validBody, sessionNonce: 'short' }).success,
    ).toBe(false)
  })

  it('rejects a sessionNonce longer than 128 chars', () => {
    expect(
      verifyProofRequestSchema.safeParse({ ...validBody, sessionNonce: 'x'.repeat(129) }).success,
    ).toBe(false)
  })

  it('rejects a missing proof', () => {
    const { proof: _, ...rest } = validBody
    expect(verifyProofRequestSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects when publicSignals contains a bad nullifier', () => {
    expect(
      verifyProofRequestSchema.safeParse({
        ...validBody,
        publicSignals: ['0xnope', '1', 'KA', 'KA-09'],
      }).success,
    ).toBe(false)
  })
})

describe('verifyProofResponseSchema (discriminated union)', () => {
  const successBody = {
    verified: true,
    handle: 'c_aaaaaaaaaa',
    citizen: {
      handle: 'c_aaaaaaaaaa',
      stateCode: 'KA',
      districtCode: 'KA-09',
      joinedAt: '2026-05-23T00:00:00.000Z',
    },
  }

  it('accepts a success envelope', () => {
    const parsed = verifyProofResponseSchema.parse(successBody)
    expect(parsed.verified).toBe(true)
    if (parsed.verified) {
      // Branch narrowing — handle accessor only exists on success.
      expect(parsed.handle).toBe('c_aaaaaaaaaa')
    }
  })

  it('accepts the optional idempotent flag on success', () => {
    const parsed = verifyProofResponseSchema.parse({ ...successBody, idempotent: true })
    if (parsed.verified) {
      expect(parsed.idempotent).toBe(true)
    }
  })

  it('accepts an error envelope with every known code', () => {
    const codes = [
      'NULLIFIER_REPLAY',
      'PROOF_MALFORMED',
      'PROOF_REJECTED',
      'S1_COMPLAINT_SUBMIT_OFF',
      'DB_DOWN',
      'ZKP_NOT_CONFIGURED',
    ] as const
    for (const code of codes) {
      const parsed = verifyProofResponseSchema.parse({
        verified: false,
        error: 'some error',
        code,
      })
      expect(parsed.verified).toBe(false)
      if (!parsed.verified) {
        expect(parsed.code).toBe(code)
      }
    }
  })

  it('rejects an error envelope with an unknown code', () => {
    expect(
      verifyProofResponseSchema.safeParse({
        verified: false,
        error: 'x',
        code: 'NOT_A_REAL_CODE',
      }).success,
    ).toBe(false)
  })

  it('rejects a payload whose verified field is non-boolean', () => {
    expect(verifyProofResponseSchema.safeParse({ ...successBody, verified: 'yes' }).success).toBe(
      false,
    )
  })

  it('verifyProofSuccessSchema rejects an error-shaped envelope', () => {
    expect(
      verifyProofSuccessSchema.safeParse({ verified: false, error: 'x', code: 'DB_DOWN' }).success,
    ).toBe(false)
  })

  it('verifyProofErrorSchema rejects a success-shaped envelope', () => {
    expect(verifyProofErrorSchema.safeParse(successBody).success).toBe(false)
  })
})

describe('citizenPublicViewSchema', () => {
  it('parses a valid view (ISO-8601 with offset)', () => {
    const out = citizenPublicViewSchema.parse({
      handle: 'c_1234567890',
      stateCode: 'KA',
      districtCode: 'KA-09',
      joinedAt: '2026-05-23T12:34:56.789+05:30',
    })
    expect(out.handle).toBe('c_1234567890')
  })

  it('rejects an ISO date with no offset (must be offset-aware)', () => {
    expect(
      citizenPublicViewSchema.safeParse({
        handle: 'c_1234567890',
        stateCode: 'KA',
        districtCode: 'KA-09',
        joinedAt: '2026-05-23T12:34:56',
      }).success,
    ).toBe(false)
  })

  it('rejects when stateCode is malformed', () => {
    expect(
      citizenPublicViewSchema.safeParse({
        handle: 'c_1234567890',
        stateCode: 'XYZ',
        districtCode: 'KA-09',
        joinedAt: '2026-05-23T00:00:00.000Z',
      }).success,
    ).toBe(false)
  })
})

describe('sessionStatusSchema', () => {
  it('accepts a verified=true payload with populated fields', () => {
    const out = sessionStatusSchema.parse({
      verified: true,
      handle: 'c_1234567890',
      stateCode: 'KA',
      districtCode: 'KA-09',
    })
    expect(out.verified).toBe(true)
  })

  it('accepts a verified=false payload with nulls', () => {
    const out = sessionStatusSchema.parse({
      verified: false,
      handle: null,
      stateCode: null,
      districtCode: null,
    })
    expect(out.handle).toBeNull()
    expect(out.stateCode).toBeNull()
    expect(out.districtCode).toBeNull()
  })

  it('rejects missing handle key', () => {
    expect(
      sessionStatusSchema.safeParse({
        verified: false,
        stateCode: null,
        districtCode: null,
      }).success,
    ).toBe(false)
  })
})

describe('deriveHandle', () => {
  it('produces a deterministic `c_<10hex>` handle from a nullifier', () => {
    const n = nullifierSchema.parse(VALID_NULLIFIER)
    const h = deriveHandle(n)
    expect(h).toMatch(/^c_[0-9a-f]{10}$/)
  })

  it('is stable for the same input', () => {
    const n = nullifierSchema.parse(VALID_NULLIFIER)
    expect(deriveHandle(n)).toBe(deriveHandle(n))
  })

  it('differs for different nullifiers', () => {
    const a = nullifierSchema.parse(`0x${'a'.repeat(64)}`)
    const b = nullifierSchema.parse(`0x${'b'.repeat(64)}`)
    expect(deriveHandle(a)).not.toBe(deriveHandle(b))
  })
})
