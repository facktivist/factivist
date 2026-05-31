/**
 * Smoke tests for the IdentityScreen Expo route.
 *
 * RTL renders against the `react-native` + `safe-area-context` + `heroui-native`
 * shims in `src/__tests__/shims/`. We assert the SafeAreaView + ScrollView
 * frame, the heading copy, and that the VerifyButton mounts inside the card.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// VerifyButton calls into `@factivist/zkp-client` at module load via
// `setProverPlatform`. Stub the module so the screen test doesn't blow up
// trying to introspect the real RN navigator.
vi.mock('@factivist/zkp-client', () => ({
  setProverPlatform: vi.fn(),
  verifyProofOnDevice: vi.fn(),
  ZkpNotConfiguredError: class extends Error {
    override name = 'ZkpNotConfiguredError'
  },
}))

import { IdentityScreen } from '../IdentityScreen.tsx'

describe('IdentityScreen', () => {
  it('renders SafeAreaView + ScrollView wrappers', () => {
    render(<IdentityScreen />)
    expect(screen.getByTestId('identity-screen')).toBeInTheDocument()
    expect(screen.getByTestId('identity-scroll')).toBeInTheDocument()
  })

  it('renders the verify-your-citizenship heading', () => {
    render(<IdentityScreen />)
    // RN accessibilityRole="header" maps to role="header" via the shim;
    // we assert on the text contract directly (matches what a screen
    // reader announces).
    expect(screen.getByText(/verify your citizenship/i)).toBeInTheDocument()
  })

  it('renders the PII-free explainer copy (ATID-IDENT-003)', () => {
    render(<IdentityScreen />)
    const explainer = screen.getByText(/never sees/i)
    const text = explainer.textContent ?? ''
    for (const term of ['name', 'Aadhaar', 'address', 'photo']) {
      expect(text).toContain(term)
    }
  })

  it('mounts the verify button inside the card footer', () => {
    render(<IdentityScreen />)
    expect(screen.getByTestId('verify-button-root')).toBeInTheDocument()
    expect(screen.getByTestId('verify-submit')).toBeInTheDocument()
  })
})
