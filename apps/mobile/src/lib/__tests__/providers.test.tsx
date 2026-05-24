import { render, screen } from '@testing-library/react'
import { Text } from 'react-native'
import { describe, expect, it } from 'vitest'
import { Providers } from '../providers'

describe('Providers', () => {
  it('renders children', () => {
    render(
      <Providers>
        <Text>hello</Text>
      </Providers>,
    )
    expect(screen.getByText('hello')).toBeDefined()
  })

  it('mounts QueryClientProvider only once per Providers instance', () => {
    const { rerender } = render(
      <Providers>
        <Text>first</Text>
      </Providers>,
    )
    expect(screen.getByText('first')).toBeDefined()
    rerender(
      <Providers>
        <Text>second</Text>
      </Providers>,
    )
    expect(screen.getByText('second')).toBeDefined()
  })
})
