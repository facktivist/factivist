/**
 * `Mod.*` compound contract — mobile (admin-only, HeroUI Native + Uniwind).
 *
 * S1 admin UI is web-first; the mobile shell ships read-only mod surfaces
 * so a moderator can triage on the go. Write actions stay web-only until
 * S2 audit + 2FA land.
 */

export interface ModQueueItem {
  readonly id: string
  readonly target: { readonly kind: 'complaint' | 'comment'; readonly id: string }
  readonly reason: string
  readonly reportedAt: string
  readonly reporterCount: number
  readonly excerpt: string
}

export type ModDecision = 'keep' | 'hide' | 'delete' | 'escalate'

export interface ModAuditEntry {
  readonly id: string
  readonly itemId: string
  readonly decision: ModDecision
  readonly moderatorHandle: string
  readonly note?: string
  readonly at: string
}

interface NativeProps {
  readonly style?: unknown
  readonly accessibilityLabel?: string
  readonly testID?: string
}

export interface ModQueueListProps extends NativeProps {
  readonly items: ReadonlyArray<ModQueueItem>
  readonly loading?: boolean
  readonly onItemOpen: (id: string) => void
}

export interface ModDecisionBarProps extends NativeProps {
  readonly itemId: string
  readonly onDecide: (input: {
    readonly itemId: string
    readonly decision: ModDecision
    readonly note?: string
  }) => void | Promise<void>
  readonly submitting?: boolean
}

export interface ModAuditTrailProps extends NativeProps {
  readonly entries: ReadonlyArray<ModAuditEntry>
}

export const MODERATION_SLOTS = {
  QueueList: 'Mod.QueueList',
  DecisionBar: 'Mod.DecisionBar',
  AuditTrail: 'Mod.AuditTrail',
} as const

export type ModerationSlot = (typeof MODERATION_SLOTS)[keyof typeof MODERATION_SLOTS]
