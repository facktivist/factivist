import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Onboarding } from '../Onboarding.tsx'

describe('Onboarding.VerifyStep', () => {
  it('renders children + reflects step/status via data-attrs', () => {
    render(
      <Onboarding.VerifyStep step="intro" status="idle" onStepChange={() => {}}>
        <p>intro content</p>
      </Onboarding.VerifyStep>,
    )
    expect(screen.getByText('intro content')).toBeInTheDocument()
    const section = screen.getByLabelText('Citizen verification')
    expect(section).toHaveAttribute('data-step', 'intro')
    expect(section).toHaveAttribute('data-status', 'idle')
  })

  it('renders the error code + message when status=error + error supplied', () => {
    render(
      <Onboarding.VerifyStep
        step="error"
        status="error"
        onStepChange={() => {}}
        error={{ code: 'AADHAAR_OCR_FAILED', message: 'Could not read QR', retryable: true }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('AADHAAR_OCR_FAILED')
    expect(screen.getByRole('alert')).toHaveTextContent('Could not read QR')
    expect(screen.getByText('You can retry this step.')).toBeInTheDocument()
  })

  it('omits the retry hint when retryable=false', () => {
    render(
      <Onboarding.VerifyStep
        step="error"
        status="error"
        onStepChange={() => {}}
        error={{ code: 'AGE_PROOF_FAIL', message: 'Permanent', retryable: false }}
      />,
    )
    expect(screen.queryByText('You can retry this step.')).toBeNull()
  })

  it('does NOT render an alert when status=idle even if error prop is passed', () => {
    render(
      <Onboarding.VerifyStep
        step="intro"
        status="idle"
        onStepChange={() => {}}
        error={{ code: 'X', message: 'stale', retryable: true }}
      />,
    )
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Onboarding.AadhaarCapture', () => {
  it('renders the framing guide + capture/cancel actions', () => {
    render(<Onboarding.AadhaarCapture onCaptured={() => {}} onCancel={() => {}} />)
    expect(screen.getByLabelText('Aadhaar viewfinder')).toBeInTheDocument()
    expect(screen.getByText(/Align the QR code/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Capture' })).toBeEnabled()
  })

  it('disables both buttons + shows Capturing… while loading', () => {
    render(<Onboarding.AadhaarCapture status="loading" onCaptured={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Capturing…' })).toBeDisabled()
  })

  it('disables both buttons when status=disabled', () => {
    render(
      <Onboarding.AadhaarCapture status="disabled" onCaptured={() => {}} onCancel={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Capture' })).toBeDisabled()
  })

  it('emits onCaptured({ opaqueToken }) when Capture is clicked', () => {
    const onCaptured = vi.fn()
    render(<Onboarding.AadhaarCapture onCaptured={onCaptured} onCancel={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    expect(onCaptured).toHaveBeenCalledOnce()
    expect(onCaptured).toHaveBeenCalledWith({ opaqueToken: '' })
  })

  it('emits onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()
    render(<Onboarding.AadhaarCapture onCaptured={() => {}} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('renders the error message in an alert when status=error', () => {
    render(
      <Onboarding.AadhaarCapture
        status="error"
        onCaptured={() => {}}
        onCancel={() => {}}
        error={{ code: 'CAM_DENIED', message: 'Camera permission denied', retryable: true }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Camera permission denied')
  })
})

describe('Onboarding.ProofProgress', () => {
  it('renders an indeterminate spinner when progress is undefined', () => {
    render(<Onboarding.ProofProgress stage="generating" />)
    expect(screen.getByRole('status')).toHaveAttribute('data-stage', 'generating')
    expect(screen.getByText(/Generating zero-knowledge proof/)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('renders a determinate progressbar when progress is a finite number', () => {
    render(<Onboarding.ProofProgress stage="verifying" progress={0.4} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('clamps progress > 1 to 100% and < 0 to 0%', () => {
    const { rerender } = render(<Onboarding.ProofProgress stage="anchoring" progress={1.5} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    rerender(<Onboarding.ProofProgress stage="anchoring" progress={-0.2} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('treats NaN as indeterminate', () => {
    render(<Onboarding.ProofProgress stage="generating" progress={Number.NaN} />)
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('renders stage-specific copy', () => {
    const { rerender } = render(<Onboarding.ProofProgress stage="verifying" />)
    expect(screen.getByText(/Verifying proof/)).toBeInTheDocument()
    rerender(<Onboarding.ProofProgress stage="anchoring" />)
    expect(screen.getByText(/Anchoring nullifier on Polygon/)).toBeInTheDocument()
  })
})

describe('Onboarding.SuccessConfirmation', () => {
  it('renders handle + the first 8 chars of the nullifier only', () => {
    render(
      <Onboarding.SuccessConfirmation
        handle="anon-rabbit-9214"
        nullifierExcerpt="0x123456789abcdef"
        onContinue={() => {}}
      />,
    )
    expect(screen.getByText('anon-rabbit-9214')).toBeInTheDocument()
    // The literal "9abcdef" past index 8 must NOT appear in the DOM.
    expect(screen.queryByText(/9abcdef/)).toBeNull()
    expect(screen.getByText('0x123456…')).toBeInTheDocument()
  })

  it('emits onContinue when the CTA is clicked', () => {
    const onContinue = vi.fn()
    render(
      <Onboarding.SuccessConfirmation
        handle="anon-x"
        nullifierExcerpt="abcdefgh"
        onContinue={onContinue}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue to feed' }))
    expect(onContinue).toHaveBeenCalledOnce()
  })
})

describe('Onboarding compound namespace', () => {
  it('exposes the four slots on the Onboarding object', () => {
    expect(typeof Onboarding.VerifyStep).toBe('function')
    expect(typeof Onboarding.AadhaarCapture).toBe('function')
    expect(typeof Onboarding.ProofProgress).toBe('function')
    expect(typeof Onboarding.SuccessConfirmation).toBe('function')
  })
})
