import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  flagComplaintMock: vi.fn(async () => undefined),
}))
const { flagComplaintMock } = mocks
vi.mock('../../../lib/api/client.ts', () => ({
  apiClient: {
    flagComplaint: mocks.flagComplaintMock,
  },
}))

import { FlagButton } from '../FlagButton.tsx'

const renderWithClient = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

describe('FlagButton', () => {
  beforeEach(() => {
    flagComplaintMock.mockClear()
  })

  it('renders only the trigger when closed', () => {
    renderWithClient(<FlagButton complaintId="c-1" />)
    expect(screen.getByTestId('flag-trigger-c-1')).toBeInTheDocument()
    // Dialog content not present until opened.
    expect(screen.queryByText(/pick the reason/i)).not.toBeInTheDocument()
  })

  it('opens the AlertDialog when the trigger is clicked', async () => {
    const user = userEvent.setup()
    renderWithClient(<FlagButton complaintId="c-1" />)
    await user.click(screen.getByTestId('flag-trigger-c-1'))
    expect(await screen.findByText(/pick the reason/i)).toBeInTheDocument()
  })

  it('renders pii-leak first per ADR-0020 priority', async () => {
    const user = userEvent.setup()
    renderWithClient(<FlagButton complaintId="c-1" />)
    await user.click(screen.getByTestId('flag-trigger-c-1'))
    const piiInput = await screen.findByTestId('flag-reason-pii-leak')
    // Default selection is pii-leak (matches FLAG_REASONS[0]).
    expect(piiInput).toBeChecked()
    // Priority badge is rendered next to pii-leak.
    expect(await screen.findByText(/priority review/i)).toBeInTheDocument()
  })

  it('renders every other flag reason as a radio', async () => {
    const user = userEvent.setup()
    renderWithClient(<FlagButton complaintId="c-1" />)
    await user.click(screen.getByTestId('flag-trigger-c-1'))
    for (const reason of [
      'pii-leak',
      'harassment',
      'misinformation',
      'spam',
      'off-topic',
    ] as const) {
      expect(screen.getByTestId(`flag-reason-${reason}`)).toBeInTheDocument()
    }
  })

  it('submits via apiClient.flagComplaint with the selected reason', async () => {
    const user = userEvent.setup()
    renderWithClient(<FlagButton complaintId="c-1" />)
    await user.click(screen.getByTestId('flag-trigger-c-1'))
    await user.click(await screen.findByTestId('flag-reason-spam'))
    await user.click(screen.getByTestId('flag-submit-c-1'))
    await waitFor(() => {
      expect(flagComplaintMock).toHaveBeenCalledWith('c-1', { reason: 'spam' })
    })
  })

  it('shows a success status message after submission', async () => {
    const user = userEvent.setup()
    renderWithClient(<FlagButton complaintId="c-2" />)
    await user.click(screen.getByTestId('flag-trigger-c-2'))
    await user.click(screen.getByTestId('flag-submit-c-2'))
    expect(await screen.findByText(/flag submitted\. thank you\./i)).toBeInTheDocument()
  })

  it('surfaces an error alert when the mutation rejects', async () => {
    flagComplaintMock.mockRejectedValueOnce(new Error('Network down'))
    const user = userEvent.setup()
    renderWithClient(<FlagButton complaintId="c-3" />)
    await user.click(screen.getByTestId('flag-trigger-c-3'))
    await user.click(screen.getByTestId('flag-submit-c-3'))
    expect(await screen.findByText(/network down/i)).toBeInTheDocument()
  })
})
