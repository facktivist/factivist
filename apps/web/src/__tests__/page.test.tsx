import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import HomePage from '../app/page.tsx'

describe('HomePage', () => {
  it('renders heading, lede, and CTA button', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { name: /welcome to factivist/i })).toBeInTheDocument()
    expect(screen.getByText(/monorepo scaffold/i)).toBeInTheDocument()
    expect(screen.getByTestId('cta-button')).toBeInTheDocument()
  })
})
