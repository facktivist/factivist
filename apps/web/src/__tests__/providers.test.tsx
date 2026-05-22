import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Providers', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders children in development and mounts devtools', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { Providers } = await import('../app/providers.tsx')
    render(
      <Providers>
        <div data-testid="child">hi</div>
      </Providers>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('hides devtools when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { Providers } = await import('../app/providers.tsx')
    render(
      <Providers>
        <div data-testid="child">hi</div>
      </Providers>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
