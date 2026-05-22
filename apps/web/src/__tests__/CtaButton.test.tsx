import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CtaButton } from '../app/_components/CtaButton.tsx'

describe('CtaButton', () => {
  it('toggles label and aria-pressed when clicked', async () => {
    const user = userEvent.setup()
    render(<CtaButton />)

    const button = screen.getByTestId('cta-button')
    expect(button).toHaveTextContent('Get started')
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await user.click(button)

    expect(button).toHaveTextContent('Thanks!')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })
})
