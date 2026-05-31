/**
 * `Onboarding.*` compound contract — web (HeroUI v3).
 *
 * Pure TypeScript scaffold. No JSX, no runtime imports. Phase 5 implements
 * against these interfaces; Phase 3 (this) only locks the shape so the
 * design system and downstream tickets agree on a single surface.
 *
 * Surface: 1 — Onboarding + anoncitizen ZKP verification (S1 §3.1)
 * Tokens consumed: surface, surfaceElevated, text, textMuted, brand,
 *   brandText, border, ring, successBg, successText, dangerBg, dangerText,
 *   space-2/4/6/8, radius-md, shadow-medium, motion.duration.base
 *
 * States every compound must implement: idle | loading | error | success
 *   (also: disabled for interactive children).
 */

/** Discrete steps the onboarding flow can be in. */
export type OnboardingStep =
  | 'intro'
  | 'aadhaar-capture'
  | 'proof-generating'
  | 'proof-verifying'
  | 'success'
  | 'error'

/** Generic status state every onboarding compound surfaces. */
export type OnboardingStatus = 'idle' | 'loading' | 'error' | 'success' | 'disabled'

/** Shared error type — never includes raw PII or device fingerprints. */
export interface OnboardingError {
  /** Stable error code for i18n + telemetry (`AADHAAR_OCR_FAILED`, etc.). */
  readonly code: string
  /** User-facing message (already-localized, never raw stack/log). */
  readonly message: string
  /** True when the user can retry the same step without going back. */
  readonly retryable: boolean
}

// ─── Onboarding.VerifyStep ────────────────────────────────────────────
/**
 * Top-level wrapper for the onboarding flow. Renders the current step's
 * UI and exposes a controlled `step` prop so navigation lives in the
 * caller (Phase 5 wires this to TanStack Query state).
 */
export interface OnboardingVerifyStepProps {
  readonly step: OnboardingStep
  readonly onStepChange: (next: OnboardingStep) => void
  readonly status?: OnboardingStatus
  readonly error?: OnboardingError
  /** Slot for the active step's content. */
  readonly children?: React.ReactNode
  /** Optional className for layout overrides; semantic tokens only. */
  readonly className?: string
}

// ─── Onboarding.AadhaarCapture ────────────────────────────────────────
/**
 * Captures the Aadhaar QR code / OCR for the anoncitizen proof. NEVER
 * persists the raw image — the captured payload is consumed in-memory by
 * the proof generator (ADR-010 anonymity floor).
 */
export interface OnboardingAadhaarCaptureProps {
  /** Called with an opaque token; raw bytes are never surfaced to React. */
  readonly onCaptured: (proofInput: { readonly opaqueToken: string }) => void
  readonly onCancel: () => void
  readonly status?: OnboardingStatus
  readonly error?: OnboardingError
  readonly className?: string
}

// ─── Onboarding.ProofProgress ─────────────────────────────────────────
/**
 * Long-running visual for ZKP generation/verification. Implementation
 * decides whether to render an indeterminate spinner or a progress bar
 * based on `progress` (undefined = indeterminate).
 */
export interface OnboardingProofProgressProps {
  /** 0..1, or `undefined` for indeterminate. */
  readonly progress?: number
  readonly stage: 'generating' | 'verifying' | 'anchoring'
  readonly status?: OnboardingStatus
  readonly className?: string
}

// ─── Onboarding.SuccessConfirmation ───────────────────────────────────
/**
 * Final success surface. MUST NOT show any PII; renders the anonymous
 * handle + nullifier excerpt only (per ADR-010 + ADR-003).
 */
export interface OnboardingSuccessConfirmationProps {
  /** Anonymous handle generated server-side. */
  readonly handle: string
  /** First 8 chars of the nullifier; never the full value. */
  readonly nullifierExcerpt: string
  readonly onContinue: () => void
  readonly className?: string
}

// ─── Slot map ─────────────────────────────────────────────────────────
/**
 * Slot identifiers — referenced from `docs/design/s1/heroui-compound-map.md`
 * and the Claude Design System workspace so designers and engineers share
 * one vocabulary.
 */
export const ONBOARDING_SLOTS = {
  VerifyStep: 'Onboarding.VerifyStep',
  AadhaarCapture: 'Onboarding.AadhaarCapture',
  ProofProgress: 'Onboarding.ProofProgress',
  SuccessConfirmation: 'Onboarding.SuccessConfirmation',
} as const

export type OnboardingSlot = (typeof ONBOARDING_SLOTS)[keyof typeof ONBOARDING_SLOTS]
