/**
 * `Legal.*` compound contract — mobile (HeroUI Native + Uniwind).
 *
 * Mobile deltas vs web:
 *   - `Page` content is a scrollable view; iOS / Android share-sheet
 *     affordance ships with the implementation (Phase 5).
 *   - `ConsentBox` uses native `Switch` per platform; the contract is
 *     identical.
 */

export type LegalPageKind = 'tos' | 'privacy' | 'zkp-explainer' | 'grievance' | 'cookie'

interface NativeProps {
  readonly style?: unknown
  readonly accessibilityLabel?: string
  readonly testID?: string
}

export interface LegalPageProps extends NativeProps {
  readonly kind: LegalPageKind
  readonly title: string
  readonly lastUpdated: string
  readonly children?: React.ReactNode
}

export interface LegalGrievanceContactProps extends NativeProps {
  readonly officer: {
    readonly name: string
    readonly designation: string
    readonly email: string
    readonly phone?: string
    readonly addressLines: ReadonlyArray<string>
  }
  readonly slaHours: number
}

export interface LegalConsentBoxProps extends NativeProps {
  readonly purposes: ReadonlyArray<{
    readonly id: string
    readonly label: string
    readonly description: string
    readonly required: boolean
  }>
  readonly value: Readonly<Record<string, boolean>>
  readonly onChange: (next: Readonly<Record<string, boolean>>) => void
}

export const LEGAL_SLOTS = {
  Page: 'Legal.Page',
  GrievanceContact: 'Legal.GrievanceContact',
  ConsentBox: 'Legal.ConsentBox',
} as const

export type LegalSlot = (typeof LEGAL_SLOTS)[keyof typeof LEGAL_SLOTS]
