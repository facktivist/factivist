import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HomeScreen } from '../features/home/HomeScreen.tsx'

describe('HomeScreen', () => {
  it('renders SafeAreaView + scrollable container', () => {
    render(<HomeScreen />)
    expect(screen.getByTestId('home-screen')).toBeInTheDocument()
    expect(screen.getByTestId('home-scroll')).toBeInTheDocument()
  })

  it('renders heading, description, and CTA', () => {
    render(<HomeScreen />)
    expect(screen.getByRole('heading', { name: /welcome to factivist/i })).toBeInTheDocument()
    expect(screen.getByText(/mobile scaffold for fact-driven publishing/i)).toBeInTheDocument()
    expect(screen.getByTestId('cta-button')).toBeInTheDocument()
  })
})
