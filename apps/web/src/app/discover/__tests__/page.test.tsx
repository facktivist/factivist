/**
 * `/discover` route — Server Component shape test.
 *
 * The route just unwraps Next.js' `searchParams` Promise + coerces
 * array values to scalars, then delegates to `<DiscoveryPage />`.
 * We mock the inner component so the test focuses on the unwrap/coerce
 * contract and doesn't pull in the real API client.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../features/discovery/DiscoveryPage.tsx', () => ({
  DiscoveryPage: (_props: unknown) => <div data-testid="discovery-page" />,
}))

import DiscoverPage from '../page.tsx'

const propsOf = async (
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<unknown> => {
  // The route returns a React element whose `props` carries what would
  // be passed to <DiscoveryPage />. We assert on `element.props` rather
  // than rendering — DiscoveryPage itself is async and pulls in the
  // real API client; the unit under test is the route's unwrap logic.
  const element = (await DiscoverPage({ searchParams })) as { props: unknown }
  return element.props
}

describe('DiscoverPage route', () => {
  it('awaits searchParams and forwards scalar entries to DiscoveryPage', async () => {
    const props = await propsOf(Promise.resolve({ q: 'water', sort: 'newest' }))
    expect(props).toEqual({ searchParams: { q: 'water', sort: 'newest' } })
  })

  it('coerces array search-param values to the first entry', async () => {
    const props = await propsOf(Promise.resolve({ q: ['first', 'second'], stateCode: 'KA' }))
    expect(props).toEqual({ searchParams: { q: 'first', stateCode: 'KA' } })
  })

  it('handles an empty searchParams object', async () => {
    const props = await propsOf(Promise.resolve({}))
    expect(props).toEqual({ searchParams: {} })
  })

  it('preserves undefined values unchanged', async () => {
    const props = await propsOf(Promise.resolve({ q: undefined, stateCode: 'KA' }))
    expect(props).toEqual({ searchParams: { q: undefined, stateCode: 'KA' } })
  })
})
