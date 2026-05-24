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
  //
  // Two consumer shapes:
  //   - citizens: insert().values().onConflictDoNothing().returning()
  //   - audit_log: insert().values()   (await thenable, no chain)
  //
  // The `values()` call returns a Thenable that also exposes
  // `onConflictDoNothing()` so both shapes work without per-call mode flags.
  const returning = vi.fn(async () => dbState.insertResult)
  const onConflictDoNothing = vi.fn(() => ({ returning }))
  /** Captures every audit_log row written during the test. */
  const auditRows: Array<Record<string, unknown>> = []
  const values = vi.fn((row?: Record<string, unknown>) => {
    // Recognise audit rows by the presence of `action` + `actor` so we
    // can both let the await resolve and record what was written.
    if (row && 'action' in row && 'actor' in row) {
      auditRows.push(row)
      return Promise.resolve()
    }
    return { onConflictDoNothing }
  })
  const insert = vi.fn(() => ({ values }))

  return { select, insert, returning, values, insertCall: insert, auditRows }
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

// ─── POST /identity/verify — cookie emission (wave-2C) ────────────────────

const SESSION_SECRET = 'a'.repeat(64) // 64 hex = 32 bytes

describe('POST /identity/verify — Set-Cookie (wave-2C)', () => {
  it('emits a signed factivist-session cookie on success', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SESSION_SECRET)
    verifyProofOnDeviceMock.mockResolvedValue(true)

    const res = await postVerify(validRequest)
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain('factivist-session=')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
    // NODE_ENV=test → Secure flag is omitted (HTTP-friendly).
    expect(setCookie).not.toContain('Secure')
  })

  it('omits Set-Cookie when FACTIVIST_SESSION_SECRET is unset (fail-open for wave-1 clients)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    // FACTIVIST_SESSION_SECRET intentionally unset.
    verifyProofOnDeviceMock.mockResolvedValue(true)

    const res = await postVerify(validRequest)
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('does not leak the raw nullifier in the response body even when the cookie carries it', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SESSION_SECRET)
    verifyProofOnDeviceMock.mockResolvedValue(true)

    const res = await postVerify(validRequest)
    const body = await res.text()
    expect(body).not.toContain(NULLIFIER)
    // sanity — handle IS present
    expect(body).toContain('c_aaaaaaaaaa')
  })
})

// ─── GET /identity/session — cookie path (wave-2C) ────────────────────────

describe('GET /identity/session — cookie auth (wave-2C)', () => {
  const getSession = async (headers?: Record<string, string>) => {
    const { identityRoute } = await import('../identity.ts')
    return identityRoute.request('/identity/session', { headers })
  }

  /** Sign a cookie payload using the production helper so the test never
   * forges signatures by hand. */
  const mintCookie = async (
    overrides?: Partial<import('../../lib/session-cookie.ts').SessionCookiePayload>,
  ) => {
    const { signSession } = await import('../../lib/session-cookie.ts')
    const cookie = signSession({
      nullifier: NULLIFIER as import('@factivist/shared/validators').Nullifier,
      handle: 'c_aaaaaaaaaa',
      stateCode: 'KA' as never,
      districtCode: 'KA-09' as never,
      sessionNonce: 'a'.repeat(32),
      issuedAt: Math.floor(Date.now() / 1000),
      ...overrides,
    })
    if (!cookie) throw new Error('test precondition: secret must be set before mintCookie()')
    return cookie
  }

  it('returns verified=true from a valid cookie WITHOUT hitting the DB', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SESSION_SECRET)
    const cookie = await mintCookie()

    const res = await getSession({ Cookie: `factivist-session=${cookie}` })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      verified: boolean
      handle: string
      stateCode: string
      districtCode: string
    }
    expect(body.verified).toBe(true)
    expect(body.handle).toBe('c_aaaaaaaaaa')
    expect(body.stateCode).toBe('KA')
    expect(body.districtCode).toBe('KA-09')
    // No nullifier in body even though the cookie carries it.
    expect(JSON.stringify(body)).not.toContain(NULLIFIER)
  })

  it('falls back to anon (200) when no cookie AND no test header AND test mode', async () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SESSION_SECRET)
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const res = await getSession()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { verified: boolean }
    expect(body.verified).toBe(false)
  })

  it('returns 401 when a cookie is present but the signature is bad (test mode)', async () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SESSION_SECRET)
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const res = await getSession({ Cookie: 'factivist-session=AAAA.BBBB' })
    // In test mode the route still falls through to the test header path —
    // which is absent here — so it returns the "auth attempted but failed"
    // 401 shape (cookie was tried, failed; no header to recover with).
    expect(res.status).toBe(401)
    const body = (await res.json()) as { verified: boolean }
    expect(body.verified).toBe(false)
  })

  it('falls back to test header path when cookie is absent but header is present', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    // Note: FACTIVIST_SESSION_SECRET unset — the cookie path immediately
    // returns secret_unset, and the test mode header fallback kicks in.
    dbState.sessionRow = [{ stateCode: 'KA', districtCode: 'KA-09' }]
    const res = await getSession({ 'x-factivist-nullifier': NULLIFIER })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { verified: boolean; handle: string }
    expect(body.verified).toBe(true)
    expect(body.handle).toMatch(/^c_[0-9a-f]{10}$/)
  })

  it('rejects an expired cookie as 401 (cookie present, expired)', async () => {
    vi.stubEnv('FACTIVIST_SESSION_SECRET', SESSION_SECRET)
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    // 25h-old issuedAt — past the 24h TTL.
    const cookie = await mintCookie({
      issuedAt: Math.floor(Date.now() / 1000) - 25 * 3600,
    })
    const res = await getSession({ Cookie: `factivist-session=${cookie}` })
    expect(res.status).toBe(401)
  })
})

// ─── POST /identity/prove (wave-2C, low-tier server fallback) ─────────────

const validProveWitness = {
  // Fake Aadhaar — `999999999999` is the project-wide test placeholder.
  // `aidefence_has_pii` must report `hasPII: false` on this fixture.
  aadhaarNumber: '999999999999',
  seed: `0x${'1'.repeat(64)}`,
  photoHash: [`0x${'2'.repeat(32)}`, `0x${'3'.repeat(32)}`] as [string, string],
}
const validProveRequest = { witness: validProveWitness }

const sampleProverResult = {
  proof: validProof,
  publicSignals: [NULLIFIER, '1700000000', 'KA', 'KA-09'] as [string, string, string, string],
}

const postProve = async (body: unknown, headers?: Record<string, string>) => {
  const { identityRoute } = await import('../identity.ts')
  return identityRoute.request('/identity/prove', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /identity/prove', () => {
  beforeEach(async () => {
    const { __resetRateLimit } = await import('../identity.ts')
    __resetRateLimit()
    const { __prover } = await import('../../lib/zkp-prover.ts')
    __prover.backend = undefined
  })

  afterEach(async () => {
    const { __prover } = await import('../../lib/zkp-prover.ts')
    __prover.backend = undefined
  })

  it('returns 200 + proof envelope on happy path', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const { __prover } = await import('../../lib/zkp-prover.ts')
    __prover.backend = vi.fn(async () => sampleProverResult)

    const res = await postProve(validProveRequest, { 'x-test-client-id': 'happy' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { proof: unknown; publicSignals: unknown[] }
    expect(body.proof).toBeDefined()
    expect(body.publicSignals).toEqual(sampleProverResult.publicSignals)
    // Anti-leak headers.
    expect(res.headers.get('cache-control')).toContain('no-store')
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'")
  })

  it('returns 400 PROOF_MALFORMED when aadhaar is the wrong length', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const res = await postProve(
      { witness: { ...validProveWitness, aadhaarNumber: '12345' } },
      { 'x-test-client-id': 'short-aadhaar' },
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('PROOF_MALFORMED')
  })

  it('returns 400 PROOF_MALFORMED when seed format is wrong', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const res = await postProve(
      { witness: { ...validProveWitness, seed: 'not-hex' } },
      { 'x-test-client-id': 'bad-seed' },
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('PROOF_MALFORMED')
  })

  it('returns 422 PROVING_FAILED when the prover throws ProvingFailedError', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const { __prover } = await import('../../lib/zkp-prover.ts')
    const { ProvingFailedError } = await import('../../lib/zkp-prover.ts')
    __prover.backend = vi.fn(async () => {
      throw new ProvingFailedError('crash')
    })

    const res = await postProve(validProveRequest, { 'x-test-client-id': 'proving-failed' })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('PROVING_FAILED')
  })

  it('returns 400 CIRCUIT_CONSTRAINT when the circuit rejects the witness', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const { __prover, CircuitConstraintError } = await import('../../lib/zkp-prover.ts')
    __prover.backend = vi.fn(async () => {
      throw new CircuitConstraintError('bad checksum')
    })

    const res = await postProve(validProveRequest, { 'x-test-client-id': 'circuit' })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('CIRCUIT_CONSTRAINT')
  })

  it('returns 503 PROVER_NOT_CONFIGURED when no backend is injected', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    // __prover.backend left undefined.
    const res = await postProve(validProveRequest, { 'x-test-client-id': 'not-config' })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('PROVER_NOT_CONFIGURED')
  })

  it('returns 503 S1_COMPLAINT_SUBMIT_OFF when the feature flag is disabled', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    dbState.flagEnabled = false
    const { __prover } = await import('../../lib/zkp-prover.ts')
    __prover.backend = vi.fn(async () => sampleProverResult)

    const res = await postProve(validProveRequest, { 'x-test-client-id': 'flag-off' })
    expect(res.status).toBe(503)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('S1_COMPLAINT_SUBMIT_OFF')
  })

  it('returns 500 with empty body on generic prover throw (no err.message leak)', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const { __prover } = await import('../../lib/zkp-prover.ts')
    __prover.backend = vi.fn(async () => {
      // Embed a fake aadhaar in the message — the route MUST NOT leak it.
      throw new Error('crash with witness 999999999999')
    })

    const res = await postProve(validProveRequest, { 'x-test-client-id': 'generic' })
    expect(res.status).toBe(500)
    const body = await res.text()
    expect(body).toBe('')
    expect(body).not.toContain('999999999999')
    expect(body).not.toContain('crash')
  })

  it('returns 429 RATE_LIMITED on the 11th request from the same source', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const { __prover } = await import('../../lib/zkp-prover.ts')
    __prover.backend = vi.fn(async () => sampleProverResult)

    for (let i = 0; i < 10; i++) {
      const res = await postProve(validProveRequest, { 'x-test-client-id': 'rate-limited-ip' })
      expect(res.status).toBe(200)
    }
    const limited = await postProve(validProveRequest, {
      'x-test-client-id': 'rate-limited-ip',
    })
    expect(limited.status).toBe(429)
    const body = (await limited.json()) as { code: string }
    expect(body.code).toBe('RATE_LIMITED')
  })

  it('writes exactly one audit_log row with no Aadhaar in its payloadHash source', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const { __prover } = await import('../../lib/zkp-prover.ts')
    __prover.backend = vi.fn(async () => sampleProverResult)

    await postProve(validProveRequest, { 'x-test-client-id': 'audit-1' })

    expect(dbMock.auditRows).toHaveLength(1)
    const row = dbMock.auditRows[0]
    expect(row).toBeDefined()
    if (!row) throw new Error('precondition')
    expect(row.action).toBe('identity.prove_attempt')
    expect(row.actor).toBe('anonymous')
    expect(row.targetKind).toBe('session')
    // targetId is a request UUID — never derived from the witness.
    expect(row.targetId).toMatch(/^[0-9a-f-]{36}$/)
    expect(row.rationale).toBeNull()
    // payloadHash is sha256 of `{proofSucceeded:true}` — 64 hex chars.
    expect(row.payloadHash).toMatch(/^[0-9a-f]{64}$/)
    // The entire row JSON must not contain ANY of the witness fields.
    const serialised = JSON.stringify(row)
    expect(serialised).not.toContain('999999999999')
    expect(serialised).not.toContain(validProveWitness.seed)
    expect(serialised).not.toContain(validProveWitness.photoHash[0])
  })

  it('writes an audit_log row even when proving fails — outcome only, no PII', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const { __prover, ProvingFailedError } = await import('../../lib/zkp-prover.ts')
    __prover.backend = vi.fn(async () => {
      throw new ProvingFailedError('nope')
    })

    await postProve(validProveRequest, { 'x-test-client-id': 'audit-fail' })
    expect(dbMock.auditRows).toHaveLength(1)
    const row = dbMock.auditRows[0]
    if (!row) throw new Error('precondition')
    expect(row.action).toBe('identity.prove_attempt')
    const serialised = JSON.stringify(row)
    expect(serialised).not.toContain('999999999999')
  })

  it('never echoes the witness back in success body', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test')
    const { __prover } = await import('../../lib/zkp-prover.ts')
    __prover.backend = vi.fn(async () => sampleProverResult)

    const res = await postProve(validProveRequest, { 'x-test-client-id': 'no-leak' })
    const body = await res.text()
    expect(body).not.toContain('999999999999')
    expect(body).not.toContain(validProveWitness.seed)
    expect(body).not.toContain(validProveWitness.photoHash[0])
    expect(body).not.toContain(validProveWitness.photoHash[1])
    // sanity: it DOES contain the proof envelope.
    expect(body).toContain('pi_a')
  })
})
