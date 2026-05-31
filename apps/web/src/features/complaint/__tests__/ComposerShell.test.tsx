/**
 * `<ComposerShell />` — swaps in the paused notice on the
 * SUBMISSION_PAUSED_MESSAGE sentinel, otherwise renders the form.
 *
 * We mock `<CreateComplaintForm />` with a stub that exposes the
 * `action` prop via a ref-like global so the test can invoke it
 * directly (and `await` the promise) instead of routing through a
 * synthetic DOM event that would leak an unhandled rejection.
 */

import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const lastActionRef: { current: ((input: unknown) => Promise<unknown>) | null } = {
  current: null,
}

vi.mock('../CreateComplaintForm.tsx', () => ({
  CreateComplaintForm: ({ action }: { action: (input: unknown) => Promise<unknown> }) => {
    lastActionRef.current = action
    return <div data-testid="form-stub" />
  },
}))

import { ComposerShell } from '../ComposerShell.tsx'
import { SUBMISSION_PAUSED_MESSAGE } from '../composerSignals.ts'

afterEach(() => {
  vi.clearAllMocks()
  lastActionRef.current = null
})

describe('ComposerShell', () => {
  it('renders the form by default', () => {
    const action = vi.fn(async () => ({ id: 'cmp_1' }))
    render(<ComposerShell action={action} />)
    expect(screen.getByTestId('form-stub')).toBeInTheDocument()
    expect(screen.queryByTestId('composer-paused')).toBeNull()
  })

  it('forwards a successful action result to the form', async () => {
    const action = vi.fn(async () => ({ id: 'cmp_2' }))
    render(<ComposerShell action={action} />)
    expect(lastActionRef.current).not.toBeNull()
    const out = await lastActionRef.current?.({ stub: true })
    expect(out).toEqual({ id: 'cmp_2' })
    expect(action).toHaveBeenCalledWith({ stub: true })
  })

  it('switches to the paused Card when the action throws SUBMISSION_PAUSED_MESSAGE', async () => {
    const action = vi.fn(async () => {
      throw new Error(SUBMISSION_PAUSED_MESSAGE)
    })
    render(<ComposerShell action={action} />)
    await act(async () => {
      await expect(lastActionRef.current?.({ stub: true })).rejects.toThrow(
        SUBMISSION_PAUSED_MESSAGE,
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('composer-paused')).toBeInTheDocument()
    })
    expect(screen.getByText(/submissions are paused/i)).toBeInTheDocument()
    expect(screen.queryByTestId('form-stub')).toBeNull()
  })

  it('rethrows non-paused errors so the form can surface them inline', async () => {
    const action = vi.fn(async () => {
      throw new Error('boom')
    })
    render(<ComposerShell action={action} />)
    await act(async () => {
      await expect(lastActionRef.current?.({ stub: true })).rejects.toThrow('boom')
    })
    // The shell did NOT swap to the paused branch for a non-paused error.
    expect(screen.queryByTestId('composer-paused')).toBeNull()
    expect(screen.getByTestId('form-stub')).toBeInTheDocument()
  })
})
