import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import RootLayout, { metadata } from '../app/layout.tsx'
import { Providers } from '../app/providers.tsx'

/**
 * `RootLayout` renders `<html>` and `<body>`, which jsdom cannot host as a
 * descendant of its own `<html>` root without emitting a hydration warning.
 * Split coverage into two safe assertions instead:
 *   1. The exported `metadata` shape (pure data — no render needed).
 *   2. A render of the inner provider subtree against a sentinel child,
 *      which exercises the same JSX path the layout uses.
 */
describe('RootLayout', () => {
  it('exposes metadata for the app', () => {
    expect(metadata.title).toBe('Factivist')
    expect(metadata.description).toContain('Factivist')
  })

  it('passes children through the providers subtree', () => {
    const { getByTestId } = render(
      <Providers>
        <span data-testid="child">child</span>
      </Providers>,
    )
    expect(getByTestId('child')).toBeInTheDocument()
  })

  it('is callable as a React element factory', () => {
    const element = RootLayout({ children: <span data-testid="child">child</span> })
    expect(element).toBeTruthy()
    expect(element.type).toBe('html')
  })
})
