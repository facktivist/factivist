import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AlertDialog, Button, Card, Input, Spinner } from '../index.ts'

// HeroUI v3 components are styled via tailwind-variants and do not require a
// global `<HeroUIProvider>` for basic rendering. If a future component needs
// one, wrap test renders here (and document the new requirement inline).

describe('@factivist/ui-web components', () => {
  it('re-exports HeroUI primitives as callable values', () => {
    expect(typeof Button).toBe('function')
    expect(typeof Card).toBe('function')
    expect(typeof Input).toBe('function')
    expect(typeof Spinner).toBe('function')
    expect(typeof AlertDialog).toBe('function')
  })

  it('renders <Button> with children visible in the DOM', () => {
    render(<Button>hi</Button>)
    expect(screen.getByText('hi')).toBeInTheDocument()
  })
})
