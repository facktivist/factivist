/**
 * Tests for the VerifyForm client island.
 *
 * Verifies:
 *   - idle state renders the CTA
 *   - submit without a pre-generated proof surfaces the "follow-up wave" error
 *   - submit posts the proof body to `${apiBaseUrl}/identity/verify`
 *   - success path renders the citizen handle
 *   - error path renders the error code + message
 *   - network failure path is caught and rendered
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { VerifyForm } from '../VerifyForm.tsx'

const NULLIFIER = `0x${'a'.repeat(64)}`

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
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('VerifyForm', () => {
  it('renders an idle CTA on mount', () => {
    render(<VerifyForm />)
    const btn = screen.getByTestId('verify-submit')
    expect(btn).toHaveTextContent(/generate & submit proof/i)
    expect(btn).not.toBeDisabled()
  })

  it('surfaces a NO_PROOF error when invoked without a pre-generated proof', async () => {
    const user = userEvent.setup()
    render(<VerifyForm />)
    await user.click(screen.getByTestId('verify-submit'))
    const err = await screen.findByTestId('verify-error')
    expect(err.textContent).toMatch(/NO_PROOF/)
    expect(err.textContent).toMatch(/follow-up wave/i)
  })

  it('POSTs to /identity/verify and renders the handle on success', async () => {
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

    const user = userEvent.setup()
    render(<VerifyForm preGeneratedProof={sampleRequest} apiBaseUrl="https://api.test" />)
    await user.click(screen.getByTestId('verify-submit'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.test/identity/verify')
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).headers).toMatchObject({ 'content-type': 'application/json' })
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(sampleRequest)

    const success = await screen.findByTestId('verify-success')
    expect(success.textContent).toContain('c_1234567890')
  })

  it('renders error code + message on a failed response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          verified: false,
          error: 'feature_disabled',
          code: 'S1_COMPLAINT_SUBMIT_OFF',
        }),
      }),
    )

    const user = userEvent.setup()
    render(<VerifyForm preGeneratedProof={sampleRequest} />)
    await user.click(screen.getByTestId('verify-submit'))
    const err = await screen.findByTestId('verify-error')
    expect(err.textContent).toContain('S1_COMPLAINT_SUBMIT_OFF')
    expect(err.textContent).toContain('feature_disabled')
  })

  it('handles network failures with a NETWORK error code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket closed')))

    const user = userEvent.setup()
    render(<VerifyForm preGeneratedProof={sampleRequest} />)
    await user.click(screen.getByTestId('verify-submit'))
    const err = await screen.findByTestId('verify-error')
    expect(err.textContent).toContain('NETWORK')
    expect(err.textContent).toContain('socket closed')
  })

  it('handles non-Error throwables (string thrown) without losing the NETWORK code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'weird'
      }),
    )
    const user = userEvent.setup()
    render(<VerifyForm preGeneratedProof={sampleRequest} />)
    await user.click(screen.getByTestId('verify-submit'))
    const err = await screen.findByTestId('verify-error')
    expect(err.textContent).toContain('NETWORK')
    expect(err.textContent).toContain('Network error')
  })

  it('defaults apiBaseUrl to empty string (same-origin fetch)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        verified: true,
        handle: 'c_aaaaaaaaaa',
        citizen: {
          handle: 'c_aaaaaaaaaa',
          stateCode: 'KA',
          districtCode: 'KA-09',
          joinedAt: '2026-05-23T00:00:00.000Z',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<VerifyForm preGeneratedProof={sampleRequest} />)
    await user.click(screen.getByTestId('verify-submit'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchMock.mock.calls[0][0]).toBe('/identity/verify')
  })
})
