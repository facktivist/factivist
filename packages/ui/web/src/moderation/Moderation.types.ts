/**
 * `Mod.*` compound contract — web (HeroUI v3, admin-only).
 *
 * Surface: 7 — Moderation queue (admin-only, NOT public).
 *
 * Per ADR-006 the queue is a Postgres table polled by the admin UI; there
 * is no Redis/Bull in S1. The compound surfaces below are RBAC-gated at
 * the route level (Phase 5 wires Supabase RLS on the table).
 *
 * Tokens consumed: surface, surfaceElevated, text, textMuted, border,
 *   borderStrong, dangerBg, dangerText, warningBg, warningText, successBg,
 *   successText, radius-md, space-2/3/4, shadow-light.
 */

/** A pending item in the moderation queue. */
export interface ModQueueItem {
  readonly id: string
  /** What is being moderated. */
  readonly target: { readonly kind: 'complaint' | 'comment'; readonly id: string }
  /** Why it surfaced (user flag with reason, automated heuristic, etc.). */
  readonly reason: string
  readonly reportedAt: string // ISO-8601
  readonly reporterCount: number
  /** Excerpt of the content — moderators see content, NOT citizen PII. */
  readonly excerpt: string
}

/** A decision a moderator can issue. */
export type ModDecision = 'keep' | 'hide' | 'delete' | 'escalate'

/** An audit trail entry — append-only, hash-chained in Phase 5. */
export interface ModAuditEntry {
  readonly id: string
  readonly itemId: string
  readonly decision: ModDecision
  /** Moderator handle (admins also have anonymous handles in S1). */
  readonly moderatorHandle: string
  readonly note?: string
  readonly at: string // ISO-8601
}

// ─── Mod.QueueList ────────────────────────────────────────────────────
export interface ModQueueListProps {
  readonly items: ReadonlyArray<ModQueueItem>
  readonly loading?: boolean
  readonly onItemOpen: (id: string) => void
  readonly className?: string
}

// ─── Mod.DecisionBar ──────────────────────────────────────────────────
export interface ModDecisionBarProps {
  readonly itemId: string
  readonly onDecide: (input: {
    readonly itemId: string
    readonly decision: ModDecision
    readonly note?: string
  }) => void | Promise<void>
  readonly submitting?: boolean
  readonly className?: string
}

// ─── Mod.AuditTrail ───────────────────────────────────────────────────
export interface ModAuditTrailProps {
  readonly entries: ReadonlyArray<ModAuditEntry>
  readonly className?: string
}

export const MODERATION_SLOTS = {
  QueueList: 'Mod.QueueList',
  DecisionBar: 'Mod.DecisionBar',
  AuditTrail: 'Mod.AuditTrail',
} as const

export type ModerationSlot = (typeof MODERATION_SLOTS)[keyof typeof MODERATION_SLOTS]
