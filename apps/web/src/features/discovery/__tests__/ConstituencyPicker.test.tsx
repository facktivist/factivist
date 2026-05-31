import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  CONSTITUENCY_NEXT_LEVEL,
  ConstituencyPicker,
  type ConstituencySelection,
} from '../ConstituencyPicker.tsx'

const renderWithClient = (
  initial: ConstituencySelection,
  onChange: (next: ConstituencySelection) => void = () => undefined,
) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ConstituencyPicker value={initial} onChange={onChange} />
    </QueryClientProvider>,
  )
}

describe('CONSTITUENCY_NEXT_LEVEL', () => {
  it('chains state → district → pc → ac → null', () => {
    expect(CONSTITUENCY_NEXT_LEVEL.state).toBe('district')
    expect(CONSTITUENCY_NEXT_LEVEL.district).toBe('pc')
    expect(CONSTITUENCY_NEXT_LEVEL.pc).toBe('ac')
    expect(CONSTITUENCY_NEXT_LEVEL.ac).toBe(null)
  })
})

describe('ConstituencyPicker', () => {
  beforeEach(() => {
    mocks.listConstituency.mockReset()
    mocks.searchConstituency.mockReset()
    mocks.listConstituency.mockResolvedValue([])
    mocks.searchConstituency.mockResolvedValue([])
  })

  it('renders the combobox role and a11y-labelled listbox', async () => {
    mocks.listConstituency.mockResolvedValue([
      { code: 'ka', label: 'Karnataka', parentCode: null, level: 'state' },
    ])
    renderWithClient({})
    const cb = await screen.findByRole('combobox')
    expect(cb).toHaveAttribute('aria-autocomplete', 'list')
    const listbox = screen.getByRole('listbox', { name: /state/i })
    expect(listbox).toBeInTheDocument()
  })

  it('renders the empty-state placeholder when no constituency picked', () => {
    renderWithClient({})
    expect(screen.getByText(/no constituency selected/i)).toBeInTheDocument()
  })

  it('shows breadcrumb segments for each filled level', () => {
    renderWithClient({
      stateCode: 'ka',
      stateLabel: 'Karnataka',
      districtCode: 'blr-u',
      districtLabel: 'Bangalore Urban',
    })
    expect(screen.getByTestId('crumb-state')).toHaveTextContent('Karnataka')
    expect(screen.getByTestId('crumb-district')).toHaveTextContent('Bangalore Urban')
  })

  it('renders the "Reset" pill once all four levels are picked', () => {
    renderWithClient({
      stateCode: 'ka',
      stateLabel: 'Karnataka',
      districtCode: 'blr-u',
      districtLabel: 'Bangalore Urban',
      pcCode: 'blr-s',
      pcLabel: 'Bangalore South',
      acCode: 'btm-layout',
      acLabel: 'BTM Layout',
    })
    expect(screen.getByText(/^selected\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('invokes onChange with the picked state node', async () => {
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

  it('switches to the search query when input >=2 chars', async () => {
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

  it('rewinds via breadcrumb click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithClient(
      {
        stateCode: 'ka',
        stateLabel: 'Karnataka',
        districtCode: 'blr-u',
        districtLabel: 'Bangalore Urban',
      },
      onChange,
    )
    await user.click(screen.getByTestId('crumb-state'))
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('district pick keeps state in payload (handlePick branch)', async () => {
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
        stateCode: 'ka',
        districtCode: 'ka-560',
        pcCode: 'ka-pc-26',
        pcLabel: 'Bangalore South',
      }),
    )
  })

  it('ac pick fills all four levels', async () => {
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
      expect.objectContaining({
        acCode: 'ka-ac-150',
        acLabel: 'BTM Layout',
      }),
    )
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
        pcCode: 'ka-pc-26',
        pcLabel: 'Bangalore South',
      },
      onChange,
    )
    await user.click(screen.getByTestId('crumb-district'))
    expect(onChange).toHaveBeenCalledWith({ stateCode: 'ka', stateLabel: 'Karnataka' })
  })

  it('breadcrumb rewind to pc preserves state + district', async () => {
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
    await user.click(screen.getByTestId('crumb-pc'))
    expect(onChange).toHaveBeenCalledWith({
      stateCode: 'ka',
      stateLabel: 'Karnataka',
      districtCode: 'ka-560',
      districtLabel: 'Bangalore Urban',
    })
  })

  it('renders "No matches." when both queries resolve empty', async () => {
    mocks.listConstituency.mockResolvedValue([])
    renderWithClient({ stateCode: 'ka', stateLabel: 'Karnataka' })
    expect(await screen.findByText(/no matches/i)).toBeInTheDocument()
  })

  it('NEVER calls navigator.geolocation (ADR-0013)', async () => {
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
