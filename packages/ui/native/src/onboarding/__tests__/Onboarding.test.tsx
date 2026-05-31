import { describe, expect, it, vi } from 'vitest'

// React Native is a peer-only dep for this package (Expo apps install
// it). Mock the primitives so importing the compound under Node doesn't
// pull in the native renderer. Each primitive is identified by a stable
// string so the React-element tree carries a recognisable `type` field
// the assertions below can walk.
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
}))

interface ReactElement {
  readonly type: unknown
  readonly props: {
    readonly children?: unknown
    readonly accessibilityLabel?: string
    readonly accessibilityState?: { readonly disabled?: boolean }
    readonly accessibilityValue?: { readonly now?: number }
    readonly onPress?: () => void
    readonly [k: string]: unknown
  }
}

const isElement = (v: unknown): v is ReactElement =>
  typeof v === 'object' && v !== null && 'type' in v && 'props' in v

const findByLabel = (node: unknown, label: string): ReactElement | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByLabel(child, label)
      if (found) return found
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

const findByType = (node: unknown, type: string): ReactElement | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type)
      if (found) return found
    }
    return null
  }
  if (!isElement(node)) return null
  if (node.type === type) return node
  return findByType(node.props.children, type)
}

describe('Onboarding (native)', () => {
  it('VerifyStep carries accessibilityLabel + step + status text', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.VerifyStep({
      step: 'intro',
      status: 'idle',
      onStepChange: () => {},
    })
    expect(isElement(tree)).toBe(true)
    expect((tree as ReactElement).props.accessibilityLabel).toBe('Citizen verification')
    expect(collectText(tree)).toContain('intro')
    expect(collectText(tree)).toContain('idle')
  })

  it('VerifyStep renders an alert when status=error + error supplied', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.VerifyStep({
      step: 'error',
      status: 'error',
      onStepChange: () => {},
      error: { code: 'AADHAAR_OCR_FAILED', message: 'Could not read QR', retryable: true },
    })
    const text = collectText(tree)
    expect(text).toContain('AADHAAR_OCR_FAILED')
    expect(text).toContain('Could not read QR')
    expect(text).toContain('You can retry this step.')
  })

  it('VerifyStep omits the retry hint when retryable=false', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.VerifyStep({
      step: 'error',
      status: 'error',
      onStepChange: () => {},
      error: { code: 'X', message: 'no retry', retryable: false },
    })
    expect(collectText(tree)).not.toContain('You can retry this step.')
  })

  it('VerifyStep does NOT render an alert when status=idle', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.VerifyStep({
      step: 'intro',
      status: 'idle',
      onStepChange: () => {},
      error: { code: 'X', message: 'stale', retryable: true },
    })
    expect(collectText(tree)).not.toContain('AADHAAR_OCR_FAILED')
    expect(collectText(tree)).not.toContain('X')
  })

  it('AadhaarCapture exposes Capture/Cancel labels + a viewfinder', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.AadhaarCapture({
      onCaptured: () => {},
      onCancel: () => {},
    })
    expect(findByLabel(tree, 'Capture')).toBeTruthy()
    expect(findByLabel(tree, 'Cancel')).toBeTruthy()
    expect(findByLabel(tree, 'Aadhaar viewfinder')).toBeTruthy()
  })

  it('AadhaarCapture disables both buttons + relabels Capture while loading', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.AadhaarCapture({
      onCaptured: () => {},
      onCancel: () => {},
      status: 'loading',
    })
    const capturing = findByLabel(tree, 'Capturing…')
    expect(capturing?.props.accessibilityState?.disabled).toBe(true)
    const cancel = findByLabel(tree, 'Cancel')
    expect(cancel?.props.accessibilityState?.disabled).toBe(true)
  })

  it('AadhaarCapture emits onCaptured + onCancel via Pressable onPress', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const onCaptured = vi.fn()
    const onCancel = vi.fn()
    const tree = Onboarding.AadhaarCapture({ onCaptured, onCancel })
    const capture = findByLabel(tree, 'Capture')
    capture?.props.onPress?.()
    expect(onCaptured).toHaveBeenCalledWith({ opaqueToken: '' })
    const cancel = findByLabel(tree, 'Cancel')
    cancel?.props.onPress?.()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('AadhaarCapture surfaces an alert when status=error', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.AadhaarCapture({
      onCaptured: () => {},
      onCancel: () => {},
      status: 'error',
      error: { code: 'CAM_DENIED', message: 'Camera permission denied', retryable: true },
    })
    expect(collectText(tree)).toContain('Camera permission denied')
  })

  it('ProofProgress renders an ActivityIndicator when progress is undefined', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.ProofProgress({ stage: 'generating' })
    expect(findByType(tree, 'ActivityIndicator')).toBeTruthy()
    expect(collectText(tree)).toContain('Generating zero-knowledge proof')
  })

  it('ProofProgress clamps progress > 1 → accessibilityValue.now = 100', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.ProofProgress({ stage: 'verifying', progress: 1.5 }) as ReactElement
    expect(tree.props.accessibilityValue?.now).toBe(100)
  })

  it('ProofProgress clamps progress < 0 → accessibilityValue.now = 0', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.ProofProgress({ stage: 'anchoring', progress: -0.2 }) as ReactElement
    expect(tree.props.accessibilityValue?.now).toBe(0)
  })

  it('ProofProgress treats NaN as indeterminate (no accessibilityValue)', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.ProofProgress({
      stage: 'anchoring',
      progress: Number.NaN,
    }) as ReactElement
    expect(tree.props.accessibilityValue).toBeUndefined()
  })

  it('ProofProgress renders stage-specific copy', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    expect(collectText(Onboarding.ProofProgress({ stage: 'verifying' }))).toContain(
      'Verifying proof',
    )
    expect(collectText(Onboarding.ProofProgress({ stage: 'anchoring' }))).toContain(
      'Anchoring nullifier on Polygon',
    )
  })

  it('SuccessConfirmation renders handle + the first 8 chars of nullifier only', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const tree = Onboarding.SuccessConfirmation({
      handle: 'anon-rabbit-9214',
      nullifierExcerpt: '0x123456789abcdef',
      onContinue: () => {},
    })
    const text = collectText(tree)
    expect(text).toContain('anon-rabbit-9214')
    expect(text).toContain('0x123456')
    expect(text).not.toContain('9abcdef')
  })

  it('SuccessConfirmation emits onContinue via the Pressable', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    const onContinue = vi.fn()
    const tree = Onboarding.SuccessConfirmation({
      handle: 'anon-x',
      nullifierExcerpt: 'abcdefgh',
      onContinue,
    })
    const cta = findByLabel(tree, 'Continue to feed')
    cta?.props.onPress?.()
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('exposes the four slots on the Onboarding compound object', async () => {
    const { Onboarding } = await import('../Onboarding.tsx')
    expect(typeof Onboarding.VerifyStep).toBe('function')
    expect(typeof Onboarding.AadhaarCapture).toBe('function')
    expect(typeof Onboarding.ProofProgress).toBe('function')
    expect(typeof Onboarding.SuccessConfirmation).toBe('function')
  })
})
