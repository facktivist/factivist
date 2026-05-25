import { describe, expect, it, vi } from 'vitest'

import type { ComplaintSummary } from '../Complaint.types.ts'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  FlatList: 'FlatList',
}))

interface ReactElement {
  readonly type: unknown
  readonly props: {
    readonly children?: unknown
    readonly accessibilityLabel?: string
    readonly accessibilityState?: { readonly disabled?: boolean; readonly checked?: boolean }
    readonly onPress?: () => void
    readonly data?: unknown
    readonly renderItem?: (info: { item: unknown }) => unknown
    readonly ListFooterComponent?: unknown
    readonly [k: string]: unknown
  }
}

const isElement = (v: unknown): v is ReactElement =>
  typeof v === 'object' && v !== null && 'type' in v && 'props' in v

const findByLabel = (node: unknown, label: string): ReactElement | null => {
  if (Array.isArray(node)) {
    for (const c of node) {
      const f = findByLabel(c, label)
      if (f) return f
    }
    return null
  }
  if (!isElement(node)) return null
  if (node.props.accessibilityLabel === label) return node
  return findByLabel(node.props.children, label)
}

const collectText = (node: unknown): string => {
  if (node == null || node === false) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join(' ')
  if (isElement(node)) return collectText(node.props.children)
  return ''
}

const summary: ComplaintSummary = {
  id: 'cmp_1',
  title: 'Pothole on MG Road',
  bodyExcerpt: 'Light has been out',
  categoryId: 4,
  geo: { state: 'KA', district: 'BLR-Urban', constituency: 'shanthi-nagar' },
  photoUrls: [],
  createdAt: '2026-05-15T10:30:00.000Z',
  commentCount: 0,
  flagged: false,
}

describe('Complaint.Composer (native)', () => {
  it('renders an accessibility-form root with children', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.Composer({
      onSubmit: () => {},
      children: 'body-slot' as unknown as React.ReactNode,
    }) as ReactElement
    expect(tree.props.accessibilityLabel).toBe('File a complaint')
    expect(collectText(tree)).toContain('body-slot')
  })
})

describe('Complaint.PhotoTray (native)', () => {
  it('shows the count + the Add button when below cap', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.PhotoTray({ photos: [], onAdd: () => {}, onRemove: () => {} })
    const flat = collectText(tree).replace(/\s+/g, '')
    expect(flat).toContain('Photos(0/3)')
    expect(findByLabel(tree, 'Add photo')).toBeTruthy()
  })

  it('hides the Add button when at the cap', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.PhotoTray({
      photos: [
        { id: '1', url: 'u', uploadState: 'uploaded' },
        { id: '2', url: 'u', uploadState: 'uploaded' },
        { id: '3', url: 'u', uploadState: 'uploaded' },
      ],
      onAdd: () => {},
      onRemove: () => {},
    })
    expect(findByLabel(tree, 'Add photo')).toBeNull()
  })

  it('emits onRemove(photo.id) when the × button is pressed', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const onRemove = vi.fn()
    const tree = Complaint.PhotoTray({
      photos: [{ id: 'p1', url: 'u', uploadState: 'uploaded' }],
      onAdd: () => {},
      onRemove,
    })
    const btn = findByLabel(tree, 'Remove photo p1')
    btn?.props.onPress?.()
    expect(onRemove).toHaveBeenCalledWith('p1')
  })

  it('emits onAdd when the + tile is pressed', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const onAdd = vi.fn()
    const tree = Complaint.PhotoTray({ photos: [], onAdd, onRemove: () => {} })
    findByLabel(tree, 'Add photo')?.props.onPress?.()
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('tones the border per uploadState (failed / uploaded / uploading / pending)', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.PhotoTray({
      photos: [
        { id: 'a', url: 'u', uploadState: 'failed' },
        { id: 'b', url: 'u', uploadState: 'uploaded' },
        { id: 'c', url: 'u', uploadState: 'uploading', progress: 0.3 },
        { id: 'd', url: 'u', uploadState: 'pending' },
      ],
      onAdd: () => {},
      onRemove: () => {},
    })
    const flat = JSON.stringify(tree)
    expect(flat).toContain('border-destructive')
    expect(flat).toContain('border-verified')
    expect(flat).toContain('border-primary')
    expect(flat).toContain('border-border')
    // progress overlay only shows for 'uploading'
    expect(flat).toContain('upload progress')
  })
})

describe('Complaint.CategoryPicker (native)', () => {
  const cats = [
    { id: 1, slug: 'roads', label: 'Roads' },
    { id: 2, slug: 'water', label: 'Water' },
  ]

  it('marks the selected category via accessibilityState.checked', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.CategoryPicker({ categories: cats, selectedId: 2, onChange: () => {} })
    const water = findByLabel(tree, 'Water')
    const roads = findByLabel(tree, 'Roads')
    expect(water?.props.accessibilityState?.checked).toBe(true)
    expect(roads?.props.accessibilityState?.checked).toBe(false)
  })

  it('emits onChange(id) when a category is pressed', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const onChange = vi.fn()
    const tree = Complaint.CategoryPicker({
      categories: cats,
      selectedId: null,
      onChange,
    })
    findByLabel(tree, 'Roads')?.props.onPress?.()
    expect(onChange).toHaveBeenCalledWith(1)
  })
})

describe('Complaint.SubmitBar (native)', () => {
  it('disables Submit when canSubmit=false', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.SubmitBar({
      canSubmit: false,
      submitting: false,
      bodyLength: 5,
      bodyLimit: 500,
      onSubmit: () => {},
    })
    const submit = findByLabel(tree, 'Submit')
    expect(submit?.props.accessibilityState?.disabled).toBe(true)
  })

  it('disables Submit + shows spinner while submitting', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.SubmitBar({
      canSubmit: true,
      submitting: true,
      bodyLength: 5,
      bodyLimit: 500,
      onSubmit: () => {},
    })
    const submit = findByLabel(tree, 'Submit')
    expect(submit?.props.accessibilityState?.disabled).toBe(true)
    expect(JSON.stringify(tree)).toContain('ActivityIndicator')
  })

  it('shows the body counter as destructive when over budget', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.SubmitBar({
      canSubmit: true,
      submitting: false,
      bodyLength: 600,
      bodyLimit: 500,
      onSubmit: () => {},
    })
    expect(collectText(tree).replace(/\s+/g, '')).toContain('600/500')
  })

  it('emits onSubmit + onSaveDraft when pressed', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const onSubmit = vi.fn()
    const onSaveDraft = vi.fn()
    const tree = Complaint.SubmitBar({
      canSubmit: true,
      submitting: false,
      bodyLength: 10,
      bodyLimit: 500,
      onSubmit,
      onSaveDraft,
    })
    findByLabel(tree, 'Submit')?.props.onPress?.()
    expect(onSubmit).toHaveBeenCalledOnce()
    findByLabel(tree, 'Save draft')?.props.onPress?.()
    expect(onSaveDraft).toHaveBeenCalledOnce()
  })

  it('omits Save draft when onSaveDraft is undefined', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.SubmitBar({
      canSubmit: true,
      submitting: false,
      bodyLength: 10,
      bodyLimit: 500,
      onSubmit: () => {},
    })
    expect(findByLabel(tree, 'Save draft')).toBeNull()
  })

  it('threads testID into the submit + draft children', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.SubmitBar({
      canSubmit: true,
      submitting: false,
      bodyLength: 10,
      bodyLimit: 500,
      onSubmit: () => {},
      onSaveDraft: () => {},
      testID: 'submit-bar',
    })
    const flat = JSON.stringify(tree)
    expect(flat).toContain('submit-bar-submit')
    expect(flat).toContain('submit-bar-draft')
  })
})

describe('Complaint.Card (native)', () => {
  it('renders title + excerpt + geo + date', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.Card({ complaint: summary, onOpen: () => {} })
    const text = collectText(tree)
    expect(text).toContain(summary.title)
    expect(text).toContain(summary.bodyExcerpt)
    expect(text).toContain('KA / BLR-Urban / shanthi-nagar')
  })

  it('emits onOpen with the complaint id when title is pressed', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const onOpen = vi.fn()
    const tree = Complaint.Card({ complaint: summary, onOpen })
    findByLabel(tree, `Open ${summary.title}`)?.props.onPress?.()
    expect(onOpen).toHaveBeenCalledWith(summary.id)
  })

  it('only renders the flag button when onFlag is supplied', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const without = Complaint.Card({ complaint: summary, onOpen: () => {} })
    expect(findByLabel(without, `Flag ${summary.title}`)).toBeNull()
    const onFlag = vi.fn()
    const withFlag = Complaint.Card({ complaint: summary, onOpen: () => {}, onFlag })
    findByLabel(withFlag, `Flag ${summary.title}`)?.props.onPress?.()
    expect(onFlag).toHaveBeenCalledWith(summary.id)
  })

  it('surfaces "Flagged for review" when flagged=true', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.Card({ complaint: { ...summary, flagged: true }, onOpen: () => {} })
    expect(collectText(tree)).toContain('Flagged for review')
  })
})

describe('Complaint.List (native)', () => {
  it('renders an empty hint when items=0 + not loading', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.List({ items: [], loading: false, onItemOpen: () => {} })
    expect(collectText(tree)).toContain('No complaints yet.')
  })

  it('honours a custom empty hint', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.List({
      items: [],
      loading: false,
      onItemOpen: () => {},
      emptyHint: 'Nothing in your constituency yet.',
    })
    expect(collectText(tree)).toContain('Nothing in your constituency yet.')
  })

  it('passes items into a FlatList when non-empty', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.List({
      items: [summary, { ...summary, id: 'cmp_2' }],
      onItemOpen: () => {},
    }) as ReactElement
    expect(tree.type).toBe('FlatList')
    expect((tree.props.data as ReadonlyArray<unknown>).length).toBe(2)
  })

  it('renderItem returns a Complaint.Card for each summary', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.List({ items: [summary], onItemOpen: () => {} }) as ReactElement
    const rendered = tree.props.renderItem?.({ item: summary })
    // Direct DFS over the rendered card — collectText skips through the
    // string children, but the title is wrapped inside a Pressable.
    expect(JSON.stringify(rendered)).toContain(summary.title)
  })

  it('renders a ListFooterComponent ActivityIndicator when loading', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.List({
      items: [summary],
      loading: true,
      onItemOpen: () => {},
    }) as ReactElement
    expect(JSON.stringify(tree.props.ListFooterComponent)).toContain('ActivityIndicator')
  })

  it('keyExtractor returns each item id', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    const tree = Complaint.List({ items: [summary], onItemOpen: () => {} }) as ReactElement
    const keyExtractor = tree.props.keyExtractor as (item: ComplaintSummary) => string
    expect(keyExtractor(summary)).toBe(summary.id)
  })
})

describe('helpers + namespace', () => {
  it('formatComplaintLocation joins state / district / constituency', async () => {
    const mod = await import('../Complaint.tsx')
    expect(mod.formatComplaintLocation(summary.geo)).toBe('KA / BLR-Urban / shanthi-nagar')
  })

  it('formatComplaintDate handles invalid ISO via the 10-char slice', async () => {
    const mod = await import('../Complaint.tsx')
    // 'not-a-date'.length === 10, so the slice is the input verbatim.
    expect(mod.formatComplaintDate('not-a-date')).toBe('not-a-date')
    // Any longer garbage gets sliced to its first 10 chars.
    expect(mod.formatComplaintDate('nonsense-string-here')).toBe('nonsense-s')
  })

  it('exposes the six S1-scope slots on the Complaint compound', async () => {
    const { Complaint } = await import('../Complaint.tsx')
    expect(typeof Complaint.Composer).toBe('function')
    expect(typeof Complaint.PhotoTray).toBe('function')
    expect(typeof Complaint.CategoryPicker).toBe('function')
    expect(typeof Complaint.SubmitBar).toBe('function')
    expect(typeof Complaint.Card).toBe('function')
    expect(typeof Complaint.List).toBe('function')
  })
})
