import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}))

import LegalKindPage from '../[kind]/page.tsx'
import { LEGAL_PAGE_REGISTRY } from '../registry.ts'

afterEach(() => {
  vi.clearAllMocks()
})

describe('LegalKindPage', () => {
  it('renders the Legal.Page wrapper for every registered kind', async () => {
    for (const entry of LEGAL_PAGE_REGISTRY) {
      const tree = await LegalKindPage({ params: Promise.resolve({ kind: entry.kind }) })
      const { unmount } = render(tree)
      expect(screen.getByTestId(`legal-${entry.kind}`)).toBeInTheDocument()
      expect(screen.getByText(entry.title)).toBeInTheDocument()
      // Counsel-pending banner present on every page until Phase 9 §3.
      expect(screen.getByText(/pending counsel sign-off/i)).toBeInTheDocument()
      unmount()
    }
  })

  it('calls notFound for an unknown kind', async () => {
    await expect(LegalKindPage({ params: Promise.resolve({ kind: 'bogus' }) })).rejects.toThrow(
      /NEXT_NOT_FOUND/,
    )
    expect(notFoundMock).toHaveBeenCalled()
  })
})
