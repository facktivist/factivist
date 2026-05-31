import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import LegalIndexPage from '../page.tsx'
import { LEGAL_PAGE_REGISTRY } from '../registry.ts'

describe('LegalIndexPage', () => {
  it('renders an entry for every page in the registry', () => {
    const tree = LegalIndexPage()
    render(tree)
    for (const entry of LEGAL_PAGE_REGISTRY) {
      expect(screen.getByText(entry.title)).toBeInTheDocument()
    }
  })

  it('links every entry to its /legal/[kind] route', () => {
    const tree = LegalIndexPage()
    const { container } = render(tree)
    for (const entry of LEGAL_PAGE_REGISTRY) {
      const link = container.querySelector(`a[href="/legal/${entry.kind}"]`)
      expect(link).not.toBeNull()
    }
  })
})
