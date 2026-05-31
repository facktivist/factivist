/**
 * `Onboarding.*` compound contract — mobile (HeroUI Native + Uniwind).
 *
 * Mirror of `@factivist/ui-web/onboarding` with mobile deltas:
 *   - `style` (RN StyleProp) instead of `className`
 *   - `accessibilityLabel` on every interactive root
 *   - `safeAreaInsets` honored by `VerifyStep` wrapper
 *   - `AadhaarCapture` uses Expo Camera + the device QR scanner (the
 *     callback contract is identical to web; the picker UX differs).
 *
 * Tokens consumed: identical to web; the JS token bag is imported from
 * `@factivist/ui-theme/tokens` and `@factivist/ui-theme/semantic` and
 * applied via Uniwind utilities (Tailwind v4 in RN).
 *
 * Pure TypeScript scaffold — no runtime imports of react-native here.
 */

/** Re-use the platform-agnostic step + status + error shapes from web. */
export type OnboardingStep =
  | 'intro'
  | 'aadhaar-capture'
  | 'proof-generating'
  | 'proof-verifying'
  | 'success'
  | 'error'

export type OnboardingStatus = 'idle' | 'loading' | 'error' | 'success' | 'disabled'

export interface OnboardingError {
  readonly code: string
  readonly message: string
  readonly retryable: boolean
}

/** Minimal RN-style props every native compound exposes. */
interface NativeProps {
  /** Free-form RN style. Implementation MUST treat as opaque. */
  readonly style?: unknown
  /** Required on every interactive surface for a11y (WCAG 2.2 AA). */
  readonly accessibilityLabel?: string
  /** Pass-through testID for Detox / Argent flows. */
  readonly testID?: string
}

// ─── Onboarding.VerifyStep ────────────────────────────────────────────
export interface OnboardingVerifyStepProps extends NativeProps {
  readonly step: OnboardingStep
  readonly onStepChange: (next: OnboardingStep) => void
  readonly status?: OnboardingStatus
  readonly error?: OnboardingError
  readonly children?: React.ReactNode
}

// ─── Onboarding.AadhaarCapture ────────────────────────────────────────
export interface OnboardingAadhaarCaptureProps extends NativeProps {
  readonly onCaptured: (proofInput: { readonly opaqueToken: string }) => void
  readonly onCancel: () => void
  readonly status?: OnboardingStatus
  readonly error?: OnboardingError
}

// ─── Onboarding.ProofProgress ─────────────────────────────────────────
export interface OnboardingProofProgressProps extends NativeProps {
  readonly progress?: number
  readonly stage: 'generating' | 'verifying' | 'anchoring'
  readonly status?: OnboardingStatus
}

// ─── Onboarding.SuccessConfirmation ───────────────────────────────────
export interface OnboardingSuccessConfirmationProps extends NativeProps {
  readonly handle: string
  readonly nullifierExcerpt: string
  readonly onContinue: () => void
}

export const ONBOARDING_SLOTS = {
  VerifyStep: 'Onboarding.VerifyStep',
  AadhaarCapture: 'Onboarding.AadhaarCapture',
  ProofProgress: 'Onboarding.ProofProgress',
  SuccessConfirmation: 'Onboarding.SuccessConfirmation',
} as const

export type OnboardingSlot = (typeof ONBOARDING_SLOTS)[keyof typeof ONBOARDING_SLOTS]
