import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listConstituency: vi.fn(),
  searchConstituency: vi.fn(),
}))

vi.mock('../../../lib/api/client.ts', () => ({
  apiClient: {
    listConstituency: mocks.listConstituency,
    searchConstituency: mocks.searchConstituency,
  },
}))

import {
  ConstituencyPickerNative,
  type ConstituencySelection,
} from '../ConstituencyPicker.native.tsx'

const renderWithClient = (
  initial: ConstituencySelection,
  onChange: (next: ConstituencySelection) => void = () => undefined,
) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ConstituencyPickerNative value={initial} onChange={onChange} />
    </QueryClientProvider>,
  )
}

describe('ConstituencyPickerNative — parity with web picker', () => {
  beforeEach(() => {
    mocks.listConstituency.mockReset()
    mocks.searchConstituency.mockReset()
    mocks.listConstituency.mockResolvedValue([])
    mocks.searchConstituency.mockResolvedValue([])
  })

  it('renders the empty state when nothing picked', () => {
    renderWithClient({})
    expect(screen.getByText(/no constituency selected/i)).toBeInTheDocument()
  })

  it('renders the breadcrumb for each filled level', () => {
    renderWithClient({
      stateCode: 'ka',
      stateLabel: 'Karnataka',
      districtCode: 'ka-560',
      districtLabel: 'Bangalore Urban',
    })
    expect(screen.getByTestId('crumb-state')).toHaveTextContent('Karnataka')
    expect(screen.getByTestId('crumb-district')).toHaveTextContent('Bangalore Urban')
  })

  it('renders the "Selected." pill once all four levels are filled', () => {
    renderWithClient({
      stateCode: 'ka',
      stateLabel: 'Karnataka',
      districtCode: 'ka-560',
      districtLabel: 'Bangalore Urban',
      pcCode: 'ka-pc-26',
      pcLabel: 'Bangalore South',
      acCode: 'ka-ac-150',
      acLabel: 'BTM Layout',
    })
    expect(screen.getByText(/^selected\./i)).toBeInTheDocument()
  })

  it('invokes onChange with state node when first option picked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    mocks.listConstituency.mockResolvedValue([
      { code: 'ka', label: 'Karnataka', parentCode: null, level: 'state' },
    ])
    renderWithClient({}, onChange)
    const opt = await screen.findByTestId('option-state-ka')
    await user.click(opt)
    expect(onChange).toHaveBeenCalledWith({ stateCode: 'ka', stateLabel: 'Karnataka' })
  })

  it('district pick keeps state in payload', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    mocks.listConstituency.mockResolvedValue([
      { code: 'ka-560', label: 'Bangalore Urban', parentCode: 'ka', level: 'district' },
    ])
    renderWithClient({ stateCode: 'ka', stateLabel: 'Karnataka' }, onChange)
    const opt = await screen.findByTestId('option-district-ka-560')
    await user.click(opt)
    expect(onChange).toHaveBeenCalledWith({
      stateCode: 'ka',
      stateLabel: 'Karnataka',
      districtCode: 'ka-560',
      districtLabel: 'Bangalore Urban',
    })
  })

  it('pc pick keeps state+district in payload', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    mocks.listConstituency.mockResolvedValue([
      { code: 'ka-pc-26', label: 'Bangalore South', parentCode: 'ka-560', level: 'pc' },
    ])
    renderWithClient(
      {
        stateCode: 'ka',
        stateLabel: 'Karnataka',
        districtCode: 'ka-560',
        districtLabel: 'Bangalore Urban',
      },
      onChange,
    )
    const opt = await screen.findByTestId('option-pc-ka-pc-26')
    await user.click(opt)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pcCode: 'ka-pc-26',
        pcLabel: 'Bangalore South',
        stateCode: 'ka',
        districtCode: 'ka-560',
      }),
    )
  })

  it('ac pick yields the complete tuple', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    mocks.listConstituency.mockResolvedValue([
      { code: 'ka-ac-150', label: 'BTM Layout', parentCode: 'ka-pc-26', level: 'ac' },
    ])
    renderWithClient(
      {
        stateCode: 'ka',
        stateLabel: 'Karnataka',
        districtCode: 'ka-560',
        districtLabel: 'Bangalore Urban',
        pcCode: 'ka-pc-26',
        pcLabel: 'Bangalore South',
      },
      onChange,
    )
    const opt = await screen.findByTestId('option-ac-ka-ac-150')
    await user.click(opt)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ acCode: 'ka-ac-150', acLabel: 'BTM Layout' }),
    )
  })

  it('breadcrumb rewind to state empties the selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithClient({ stateCode: 'ka', stateLabel: 'Karnataka' }, onChange)
    await user.click(screen.getByTestId('crumb-state'))
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('breadcrumb rewind to district preserves state only', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithClient(
      {
        stateCode: 'ka',
        stateLabel: 'Karnataka',
        districtCode: 'ka-560',
        districtLabel: 'Bangalore Urban',
      },
      onChange,
    )
    await user.click(screen.getByTestId('crumb-district'))
    expect(onChange).toHaveBeenCalledWith({ stateCode: 'ka', stateLabel: 'Karnataka' })
  })

  it('breadcrumb rewind to pc preserves state+district', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithClient(
      {
        stateCode: 'ka',
        stateLabel: 'Karnataka',
        districtCode: 'ka-560',
        districtLabel: 'Bangalore Urban',
        pcCode: 'ka-pc-26',
        pcLabel: 'Bangalore South',
      },
      onChange,
    )
    await user.click(screen.getByTestId('crumb-pc'))
    expect(onChange).toHaveBeenCalledWith({
      stateCode: 'ka',
      stateLabel: 'Karnataka',
      districtCode: 'ka-560',
      districtLabel: 'Bangalore Urban',
    })
  })

  it('breadcrumb rewind to ac preserves state+district+pc', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithClient(
      {
        stateCode: 'ka',
        stateLabel: 'Karnataka',
        districtCode: 'ka-560',
        districtLabel: 'Bangalore Urban',
        pcCode: 'ka-pc-26',
        pcLabel: 'Bangalore South',
        acCode: 'ka-ac-150',
        acLabel: 'BTM Layout',
      },
      onChange,
    )
    await user.click(screen.getByTestId('crumb-ac'))
    expect(onChange).toHaveBeenCalledWith({
      stateCode: 'ka',
      stateLabel: 'Karnataka',
      districtCode: 'ka-560',
      districtLabel: 'Bangalore Urban',
      pcCode: 'ka-pc-26',
      pcLabel: 'Bangalore South',
    })
  })

  it('switches to the search query when input >=2 chars (ADR-0017 combobox)', async () => {
    const user = userEvent.setup()
    mocks.searchConstituency.mockResolvedValue([
      { code: 'ka', label: 'Karnataka', parentCode: null, level: 'state' },
    ])
    renderWithClient({})
    await user.type(screen.getByTestId('constituency-search'), 'ka')
    await waitFor(() => {
      expect(mocks.searchConstituency).toHaveBeenCalled()
    })
  })

  it('renders the "Loading…" string while a query is in-flight', () => {
    mocks.listConstituency.mockReturnValue(new Promise(() => undefined))
    renderWithClient({})
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders "No matches." when both queries resolve empty', async () => {
    mocks.listConstituency.mockResolvedValue([])
    renderWithClient({ stateCode: 'ka', stateLabel: 'Karnataka' })
    expect(await screen.findByText(/no matches/i)).toBeInTheDocument()
  })

  it('NEVER calls navigator.geolocation (ADR-0013 manual geo only)', async () => {
    const geoSpy = vi.fn()
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      get() {
        geoSpy()
        return undefined
      },
    })
    renderWithClient({})
    expect(geoSpy).not.toHaveBeenCalled()
  })
})
