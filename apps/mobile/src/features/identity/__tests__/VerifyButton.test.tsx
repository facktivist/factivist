/**
 * Tests for the mobile VerifyButton.
 *
 * Covers:
 *   - setProverPlatform is called at module import per Platform.OS
 *   - idle render
 *   - submit without pre-proof surfaces a NO_PROOF error
 *   - happy path posts to /identity/verify and renders the handle
 *   - error envelope is rendered
 *   - ZkpNotConfiguredError from device verify is swallowed; we still fall
 *     back to server-side verification (fetch still fires)
 *   - non-ZkpNotConfigured errors propagate to the NETWORK error branch
 *   - network failure renders NETWORK
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NULLIFIER = `0x${'a'.repeat(64)}`

const setProverPlatformMock = vi.fn()
const verifyProofOnDeviceMock = vi.fn()
class FakeZkpNotConfiguredError extends Error {
  override name = 'ZkpNotConfiguredError'
}

vi.mock('@factivist/zkp-client', () => ({
  setProverPlatform: setProverPlatformMock,
  verifyProofOnDevice: (...args: unknown[]) => verifyProofOnDeviceMock(...args),
  ZkpNotConfiguredError: FakeZkpNotConfiguredError,
}))

const sampleRequest = {
  proof: {
    pi_a: ['1', '2', '3'] as [string, string, string],
    pi_b: [
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
    ] as [[string, string], [string, string], [string, string]],
    pi_c: ['7', '8', '9'] as [string, string, string],
    protocol: 'groth16' as const,
    curve: 'bn128' as const,
  },
  publicSignals: [NULLIFIER, '1', 'KA', 'KA-09'] as [string, string, string, string],
  sessionNonce: 'a'.repeat(32),
}

beforeEach(() => {
  setProverPlatformMock.mockClear()
  verifyProofOnDeviceMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('module bootstrap', () => {
  it('calls setProverPlatform with the current Platform.OS at first import', async () => {
    // First import after the vi.mock above wires in our spy.
    await import('../VerifyButton.tsx')
    // The shim ships Platform.OS = 'ios'; the button maps to either 'ios' or 'android'.
    expect(setProverPlatformMock).toHaveBeenCalled()
    const arg = setProverPlatformMock.mock.calls[0]?.[0]
    expect(['ios', 'android']).toContain(arg)
  })
})

describe('VerifyButton — render + idle', () => {
  it('renders the CTA in the idle state', async () => {
    const { VerifyButton } = await import('../VerifyButton.tsx')
    render(<VerifyButton />)
    const btn = screen.getByTestId('verify-submit')
    expect(btn).toHaveTextContent(/generate & submit proof/i)
    expect(screen.getByTestId('verify-button-root')).toBeInTheDocument()
  })
})

describe('VerifyButton — submit without preGeneratedProof', () => {
  it('renders a NO_PROOF error', async () => {
    const { VerifyButton } = await import('../VerifyButton.tsx')
    const user = userEvent.setup()
    render(<VerifyButton />)
    await user.click(screen.getByTestId('verify-submit'))
    const err = await screen.findByTestId('verify-error')
    expect(err.textContent).toContain('NO_PROOF')
    expect(err.textContent).toMatch(/follow-up wave/i)
  })
})

describe('VerifyButton — happy path', () => {
  it('verifies locally + POSTs to /identity/verify + renders the handle', async () => {
    verifyProofOnDeviceMock.mockResolvedValue(true)
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        verified: true,
        handle: 'c_1234567890',
        citizen: {
          handle: 'c_1234567890',
          stateCode: 'KA',
          districtCode: 'KA-09',
          joinedAt: '2026-05-23T00:00:00.000Z',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { VerifyButton } = await import('../VerifyButton.tsx')
    const user = userEvent.setup()
    render(<VerifyButton preGeneratedProof={sampleRequest} apiBaseUrl="https://api.test" />)
    await user.click(screen.getByTestId('verify-submit'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(verifyProofOnDeviceMock).toHaveBeenCalledWith(
      sampleRequest.proof,
      sampleRequest.publicSignals,
    )
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/identity/verify')

    const success = await screen.findByTestId('verify-success')
    expect(success.textContent).toContain('c_1234567890')
  })
})

describe('VerifyButton — ZkpNotConfigured fallback', () => {
  it('swallows ZkpNotConfiguredError from device verify and still posts to the server', async () => {
    verifyProofOnDeviceMock.mockRejectedValue(new FakeZkpNotConfiguredError('no vkey on device'))
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        verified: true,
        handle: 'c_bbbbbbbbbb',
        citizen: {
          handle: 'c_bbbbbbbbbb',
          stateCode: 'KA',
          districtCode: 'KA-09',
          joinedAt: '2026-05-23T00:00:00.000Z',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { VerifyButton } = await import('../VerifyButton.tsx')
    const user = userEvent.setup()
    render(<VerifyButton preGeneratedProof={sampleRequest} />)
    await user.click(screen.getByTestId('verify-submit'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const success = await screen.findByTestId('verify-success')
    expect(success.textContent).toContain('c_bbbbbbbbbb')
  })
})

describe('VerifyButton — error envelope from server', () => {
  it('renders error code + message when verified=false', async () => {
    verifyProofOnDeviceMock.mockResolvedValue(true)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          verified: false,
          error: 'nullifier_already_used',
          code: 'NULLIFIER_REPLAY',
        }),
      }),
    )

    const { VerifyButton } = await import('../VerifyButton.tsx')
    const user = userEvent.setup()
    render(<VerifyButton preGeneratedProof={sampleRequest} />)
    await user.click(screen.getByTestId('verify-submit'))
    const err = await screen.findByTestId('verify-error')
    expect(err.textContent).toContain('NULLIFIER_REPLAY')
    expect(err.textContent).toContain('nullifier_already_used')
  })
})

describe('VerifyButton — non-ZkpNotConfigured device error propagates', () => {
  it('routes to the NETWORK branch when the device verify throws a different error', async () => {
    verifyProofOnDeviceMock.mockRejectedValue(new Error('device math fault'))
    // fetch should never be reached.
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { VerifyButton } = await import('../VerifyButton.tsx')
    const user = userEvent.setup()
    render(<VerifyButton preGeneratedProof={sampleRequest} />)
    await user.click(screen.getByTestId('verify-submit'))
    const err = await screen.findByTestId('verify-error')
    expect(err.textContent).toContain('NETWORK')
    expect(err.textContent).toContain('device math fault')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('VerifyButton — fetch network failure', () => {
  it('renders NETWORK error when fetch rejects', async () => {
    verifyProofOnDeviceMock.mockResolvedValue(true)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('TLS reset')))

    const { VerifyButton } = await import('../VerifyButton.tsx')
    const user = userEvent.setup()
    render(<VerifyButton preGeneratedProof={sampleRequest} />)
    await user.click(screen.getByTestId('verify-submit'))
    const err = await screen.findByTestId('verify-error')
    expect(err.textContent).toContain('NETWORK')
    expect(err.textContent).toContain('TLS reset')
  })

  it('handles non-Error thrown values from fetch with a generic Network error', async () => {
    verifyProofOnDeviceMock.mockResolvedValue(true)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'weird'
      }),
    )

    const { VerifyButton } = await import('../VerifyButton.tsx')
    const user = userEvent.setup()
    render(<VerifyButton preGeneratedProof={sampleRequest} />)
    await user.click(screen.getByTestId('verify-submit'))
    const err = await screen.findByTestId('verify-error')
    expect(err.textContent).toContain('NETWORK')
    expect(err.textContent).toContain('Network error')
  })
})
