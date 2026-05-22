import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CtaButton } from '../features/home/components/CtaButton.tsx'

describe('CtaButton', () => {
  it('renders initial label and unselected a11y state', () => {
    render(<CtaButton />)
    const button = screen.getByTestId('cta-button')
    expect(button).toHaveTextContent('Get started')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('aria-label', 'Get started')
  })

  it('toggles label and aria-pressed when pressed', async () => {
    const user = userEvent.setup()
    render(<CtaButton />)

    const button = screen.getByTestId('cta-button')
    await user.click(button)

    expect(button).toHaveTextContent('Thanks!')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('aria-label', 'Thanks!')
  })

  it('uses the primary semantic variant', () => {
    render(<CtaButton />)
    expect(screen.getByTestId('cta-button')).toHaveAttribute('data-variant', 'primary')
  })
})
