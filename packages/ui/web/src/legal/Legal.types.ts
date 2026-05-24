/**
 * `Legal.*` compound contract — web (HeroUI v3).
 *
 * Surface: 8 — Static legal pages (ToS, privacy, ZKP explainer) +
 * DPDP-compliant consent affordances + IT Act grievance officer contact.
 *
 * Tokens consumed: surface, surfaceElevated, text, textMuted, border,
 *   ring, radius-md, space-2/3/4/6, motion.duration.fast.
 */

/** Static page identifier — the legal-page registry lives in apps/web. */
export type LegalPageKind = 'tos' | 'privacy' | 'zkp-explainer' | 'grievance' | 'cookie'

// ─── Legal.Page ───────────────────────────────────────────────────────
/**
 * Static document wrapper. Renders MDX/markdown content with a consistent
 * masthead, last-updated stamp, and a printable variant.
 */
export interface LegalPageProps {
  readonly kind: LegalPageKind
  readonly title: string
  /** ISO-8601 date the page was last edited (NOT viewed). */
  readonly lastUpdated: string
  readonly children?: React.ReactNode
  readonly className?: string
}

// ─── Legal.GrievanceContact ───────────────────────────────────────────
/**
 * IT Rules 2021 grievance officer contact card. Required to be displayed
 * with monthly compliance reports; field shape mirrors the Rules.
 */
export interface LegalGrievanceContactProps {
  readonly officer: {
    readonly name: string
    readonly designation: string
    readonly email: string
    /** Phone is OPTIONAL — the rule allows email-only acknowledgement. */
    readonly phone?: string
    readonly addressLines: ReadonlyArray<string>
  }
  /** Acknowledged-within-N-hours SLA the operator commits to. */
  readonly slaHours: number
  readonly className?: string
}

// ─── Legal.ConsentBox ─────────────────────────────────────────────────
/**
 * DPDP Act 2023 consent affordance. Each consent purpose is a discrete
 * row with its own toggle so withdrawal works per-purpose (DPDP §6(4)).
 */
export interface LegalConsentBoxProps {
  readonly purposes: ReadonlyArray<{
    readonly id: string
    readonly label: string
    readonly description: string
    readonly required: boolean
  }>
  readonly value: Readonly<Record<string, boolean>>
  readonly onChange: (next: Readonly<Record<string, boolean>>) => void
  readonly className?: string
}

export const LEGAL_SLOTS = {
  Page: 'Legal.Page',
  GrievanceContact: 'Legal.GrievanceContact',
  ConsentBox: 'Legal.ConsentBox',
} as const

export type LegalSlot = (typeof LEGAL_SLOTS)[keyof typeof LEGAL_SLOTS]
