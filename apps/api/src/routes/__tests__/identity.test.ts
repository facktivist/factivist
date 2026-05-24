/**
 * Integration tests for the identity routes (Hono `app.request()`).
 *
 * Contract: `docs/architecture/phase-5/identity-contract.md` §1, §5.
 * ATIDs covered: IDENT-001 (happy path), IDENT-002 (replay), IDENT-003 (no PII
 * surfaced), IDENT-005 (handle on response), IDENT-007 (response whitelist).
 *
 * Strategy: mock `@factivist/db/client.createClient` to return a chainable
 * stub; mock `@factivist/zkp-client.verifyProofOnDevice` to control verifier
 * outcome; flip `DATABASE_URL` to exercise the 503 branches.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NULLIFIER = `0x${'a'.repeat(64)}`

const validProof = {
  pi_a: ['1', '2', '3'],
  pi_b: [
    ['1', '2'],
    ['3', '4'],
    ['5', '6'],
  ],
  pi_c: ['7', '8', '9'],
  protocol: 'groth16' as const,
  curve: 'bn128' as const,
}

const validRequest = {
  proof: validProof,
  publicSignals: [NULLIFIER, '1700000000', 'KA', 'KA-09'],
  sessionNonce: 'a'.repeat(32),
}

// ─── Mocks ───────────────────────────────────────────────────────────────
type DbState = {
  flagEnabled: boolean | null // null → no row (unknown flag)
  insertResult: Array<{ createdAt: Date }>
  sessionRow: Array<{ stateCode: string; districtCode: string }>
  /** When set, throws instead of resolving (simulates connection refused). */
  flagThrows?: Error
}

const dbState: DbState = {
  flagEnabled: true,
  insertResult: [{ createdAt: new Date('2026-05-23T00:00:00.000Z') }],
  sessionRow: [],
}

const resetDbState = () => {
  dbState.flagEnabled = true
  dbState.insertResult = [{ createdAt: new Date('2026-05-23T00:00:00.000Z') }]
  dbState.sessionRow = []
  dbState.flagThrows = undefined
}

const buildDbMock = () => {
  // SELECT chain — used by both the flag read and the session lookup.
  // We disambiguate by inspecting argument order: the flag select uses
  // `featureFlags.enabled`, the session select uses two citizens columns.
  let lastSelect: 'flag' | 'session' = 'flag'

  const limit = vi.fn(async () => {
    if (lastSelect === 'flag') {
      if (dbState.flagThrows) throw dbState.flagThrows
      return dbState.flagEnabled === null ? [] : [{ enabled: dbState.flagEnabled }]
    }
    return dbState.sessionRow
  })
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where }))
  const select = vi.fn((shape?: Record<string, unknown>) => {
    // `select({ enabled: ... })` (flag) vs `select({ stateCode, districtCode })` (session).
    lastSelect = shape && 'enabled' in shape ? 'flag' : 'session'
    return { from }
  })

  // INSERT chain.
  const returning = vi.fn(async () => dbState.insertResult)
  const onConflictDoNothing = vi.fn(() => ({ returning }))
  const values = vi.fn(() => ({ onConflictDoNothing }))
  const insert = vi.fn(() => ({ values }))

  return { select, insert, returning, values, insertCall: insert }
}

let dbMock = buildDbMock()
const createClientMock = vi.fn(() => dbMock)

vi.mock('@factivist/db/client', () => ({
  createClient: createClientMock,
}))

const verifyProofOnDeviceMock = vi.fn()
class FakeZkpNotConfiguredError extends Error {
  override name = 'ZkpNotConfiguredError'
}
vi.mock('@factivist/zkp-client', () => ({
  verifyProofOnDevice: (...args: unknown[]) => verifyProofOnDeviceMock(...args),
  ZkpNotConfiguredError: FakeZkpNotConfiguredError,
}))

// ─── Lifecycle ───────────────────────────────────────────────────────────

beforeEach(() => {
  vi.unstubAllEnvs()
  createClientMock.mockClear()
  dbMock = buildDbMock()
  // Re-wire factory to return the freshly built mock.
  createClientMock.mockImplementation(() => dbMock)
  verifyProofOnDeviceMock.mockReset()
  resetDbState()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const postVerify = async (body: unknown) => {
  const { identityRoute } = await import('../identity.ts')
  return identityRoute.request('/identity/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── POST /identity/verify ───────────────────────────────────────────────

describe('POST /identity/verify — happy path', () => {
  it('returns 200 with a verified envelope and inserts the citizen row', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    verifyProofOnDeviceMock.mockResolvedValue(true)

    const res = await postVerify(validRequest)
    expect(res.status).toBe(200)

    const body = (await res.json()) as {
      verified: boolean
      handle: string
      citizen: { handle: string; stateCode: string; districtCode: string; joinedAt: string }
    }
    expect(body.verified).toBe(true)
    expect(body.handle).toMatch(/^c_[0-9a-f]{10}$/)
    expect(body.citizen.stateCode).toBe('KA')
    expect(body.citizen.districtCode).toBe('KA-09')
    expect(body.citizen.joinedAt).toBe('2026-05-23T00:00:00.000Z')

    // The verifier was called exactly once with the proof shape.
    expect(verifyProofOnDeviceMock).toHaveBeenCalledOnce()

    // PII safety (ATID-IDENT-007): response must not contain banned fields.
    const json = JSON.stringify(body)
    for (const banned of ['nullifier', 'aadhaar', 'name', 'email', 'phone', 'ip', 'photo']) {
      expect(json.toLowerCase()).not.toContain(banned)
    }
  })
})

describe('POST /identity/verify — replay (NULLIFIER_REPLAY)', () => {
  it('returns 409 when the nullifier already exists', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    verifyProofOnDeviceMock.mockResolvedValue(true)
    dbState.insertResult = [] // onConflictDoNothing → 0 rows returned

    const res = await postVerify(validRequest)
    expect(res.status).toBe(409)
    const body = (await res.json()) as { verified: boolean; error: string; code: string }
    expect(body).toMatchObject({
      verified: false,
      error: 'nullifier_already_used',
      code: 'NULLIFIER_REPLAY',
    })
  })
})

describe('POST /identity/verify — malformed proof (PROOF_MALFORMED)', () => {
  it('returns 400 when the body fails Zod validation', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const res = await postVerify({ ...validRequest, proof: { not: 'a proof' } })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('PROOF_MALFORMED')
  })

  it('returns 400 when nullifier in publicSignals is malformed', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const res = await postVerify({
      ...validRequest,
      publicSignals: ['0xnope', '1', 'KA', 'KA-09'],
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('PROOF_MALFORMED')
  })

  it('returns 400 when sessionNonce is too short', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const res = await postVerify({ ...validRequest, sessionNonce: 'short' })
    expect(res.status).toBe(400)
  })
})

describe('POST /identity/verify — rejected proof (PROOF_REJECTED)', () => {
  it('returns 400 when the verifier returns false (proof shape ok, math bad)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    verifyProofOnDeviceMock.mockResolvedValue(false)

    const res = await postVerify(validRequest)
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('PROOF_REJECTED')
    // Importantly: no insert should have run.
    expect(dbMock.insert).not.toHaveBeenCalled()
  })
})

describe('POST /identity/verify — feature flag off (S1_COMPLAINT_SUBMIT_OFF)', () => {
  it('returns 503 when S1_COMPLAINT_SUBMIT=false', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    dbState.flagEnabled = false

    const res = await postVerify(validRequest)
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string; error: string }
    expect(body).toMatchObject({
      verified: false,
      error: 'feature_disabled',
      code: 'S1_COMPLAINT_SUBMIT_OFF',
    })
    // Verifier must not be reached when the flag is off.
    expect(verifyProofOnDeviceMock).not.toHaveBeenCalled()
  })

  it('returns 503 when the flag row is missing (fail-closed)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    dbState.flagEnabled = null

    const res = await postVerify(validRequest)
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('S1_COMPLAINT_SUBMIT_OFF')
  })
})

describe('POST /identity/verify — zkp not configured (ZKP_NOT_CONFIGURED)', () => {
  it('returns 503 when the verifier throws ZkpNotConfiguredError', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    verifyProofOnDeviceMock.mockRejectedValue(new FakeZkpNotConfiguredError('no vkey'))

    const res = await postVerify(validRequest)
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string; error: string }
    expect(body).toMatchObject({
      verified: false,
      error: 'zkp_not_configured',
      code: 'ZKP_NOT_CONFIGURED',
    })
  })

  it('propagates non-ZkpNotConfigured errors as 500 (server fault)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    verifyProofOnDeviceMock.mockRejectedValue(new Error('CPU exploded'))

    const res = await postVerify(validRequest)
    expect(res.status).toBe(500)
  })
})

describe('POST /identity/verify — DB down (DB_DOWN)', () => {
  it('returns 503 when DATABASE_URL is unset', async () => {
    vi.stubEnv('DATABASE_URL', '')

    const res = await postVerify(validRequest)
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string; error: string }
    expect(body).toMatchObject({
      verified: false,
      error: 'db_down',
      code: 'DB_DOWN',
    })
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('returns 503 when insert returns no row (defence-in-depth)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    verifyProofOnDeviceMock.mockResolvedValue(true)
    // Pathological case: insert pretends to succeed but returns [undefined].
    dbState.insertResult = [undefined as unknown as { createdAt: Date }]

    const res = await postVerify(validRequest)
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('DB_DOWN')
  })
})

// ─── GET /identity/session ───────────────────────────────────────────────

describe('GET /identity/session', () => {
  const getSession = async (headers?: Record<string, string>) => {
    const { identityRoute } = await import('../identity.ts')
    return identityRoute.request('/identity/session', { headers })
  }

  it('returns the anon shape when no header is present', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const res = await getSession()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      verified: boolean
      handle: string | null
      stateCode: string | null
      districtCode: string | null
    }
    expect(body).toEqual({
      verified: false,
      handle: null,
      stateCode: null,
      districtCode: null,
    })
  })

  it('returns 503 when DATABASE_URL is unset AND a header is supplied', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const res = await getSession({ 'x-factivist-nullifier': NULLIFIER })
    expect(res.status).toBe(503)
  })

  it('returns anon when the header is malformed', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const res = await getSession({ 'x-factivist-nullifier': 'not-a-nullifier' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { verified: boolean }
    expect(body.verified).toBe(false)
  })

  it('returns anon when the citizen row does not exist', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    dbState.sessionRow = []
    const res = await getSession({ 'x-factivist-nullifier': NULLIFIER })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { verified: boolean }
    expect(body.verified).toBe(false)
  })

  it('returns verified=true with handle + geo when the row exists', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    dbState.sessionRow = [{ stateCode: 'KA', districtCode: 'KA-09' }]
    const res = await getSession({ 'x-factivist-nullifier': NULLIFIER })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      verified: boolean
      handle: string
      stateCode: string
      districtCode: string
    }
    expect(body.verified).toBe(true)
    expect(body.handle).toMatch(/^c_[0-9a-f]{10}$/)
    expect(body.stateCode).toBe('KA')
    expect(body.districtCode).toBe('KA-09')
    // No leak of the raw nullifier in the response.
    expect(JSON.stringify(body)).not.toContain(NULLIFIER)
  })
})
