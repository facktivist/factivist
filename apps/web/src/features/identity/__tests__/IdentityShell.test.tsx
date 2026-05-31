/**
 * Smoke tests for the IdentityShell server component.
 *
 * RTL renders the JSX directly; we assert the static framing copy and the
 * presence of the client island marker. The actual "use client" boundary
 * is a build-time concept — at runtime under Vitest the component is just
 * a function, so we verify the composition + the PII-free copy mandated
 * by ATID-IDENT-003.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { IdentityShell } from '../IdentityShell.tsx'

describe('IdentityShell', () => {
  it('renders the shell + heading + PII-free explainer + verify form testIDs', () => {
    render(<IdentityShell />)
    expect(screen.getByTestId('identity-shell')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /verify your citizenship/i })).toBeInTheDocument()
    expect(screen.getByText(/zero-knowledge proof/i)).toBeInTheDocument()
    expect(screen.getByTestId('verify-form')).toBeInTheDocument()
  })

  it('explicitly disclaims storage of name, Aadhaar, address, or photo (ATID-IDENT-003)', () => {
    render(<IdentityShell />)
    const explainer = screen.getByText(/never sees/i)
    const text = explainer.textContent ?? ''
    for (const term of ['name', 'Aadhaar', 'address', 'photo']) {
      expect(text).toContain(term)
    }
  })
})
