# W7 Moderation/Admin compound migration — deferred to S2

> Origin: app-screen-migration backlog item W7 (see
> `pattern_s1_phase_5_done.md` + the chat that produced this S1 sweep).

## Summary

W7 was specced as "migrate `apps/web/src/features/admin/*` to consume
the `@factivist/ui-web/moderation` compound (`Mod.QueueList`,
`Mod.DecisionBar`, `Mod.AuditTrail`)". After auditing the actual code
that shipped under Phase 5 Pipeline C, the migration cannot land
cleanly without surgery to either the compound types, the shared
moderation validator, or the admin API surface — all of which are out
of scope for the W3–M9 sweep.

This note documents the gap so the S2 plan can absorb it without
re-discovery.

## Why a clean migration is blocked

### Decision vocabulary mismatch

| Surface | Decision values |
|---|---|
| `apps/web/src/features/admin/ModerationDecisionForm.tsx` + `packages/shared/src/validators/moderation.ts` | `'approve' \| 'remove' \| 'escalate'` |
| `packages/ui/web/src/moderation/Moderation.types.ts` (`ModDecision`) | `'keep' \| 'hide' \| 'delete' \| 'escalate'` |

The shared validator (and therefore the API contract) is the canonical
side. Adopting `Mod.DecisionBar` would either:

- Force a Zod + API schema change cascading into the audit-log
  writer, the test suite (`packages/shared/src/validators/__tests__/moderation.test.ts`),
  and the front-end form copy, OR
- Wrap the compound in an adapter that translates each path-side
  decision to its compound-side counterpart, defeating the migration's
  point (the compound stops being the source of truth).

### Queue-row shape mismatch

| Surface | Per-row fields exposed |
|---|---|
| `apiClient.listModerationQueue` → `queueItemSchema` | `id`, `complaintSlug`, `reason`, `targetKind`, `slaDueAt` |
| `Mod.QueueList` (`ModQueueItem`) | `id`, `target.kind` + `target.id`, `reason`, `reportedAt`, `reporterCount`, `excerpt` |

The compound carries fields the API does not return (`reporterCount`,
`excerpt`, `reportedAt`) and omits fields the operator UI actually uses
in production (`complaintSlug`, `slaDueAt`). The latter drives the
`SlaCountdownBadge` and the slug-based deep link — dropping them is a
UX regression.

### Audit shape mismatch

| Surface | Row shape |
|---|---|
| `apiClient.listAuditLog` → `AuditLogEntry` (system-wide, append-only) | `ts`, `actor`, `action`, `targetKind`, `targetId`, `payloadHash` |
| `Mod.AuditTrail` (`ModAuditEntry`) | `id`, `itemId` (per-case), `decision`, `moderatorHandle`, `note?`, `at` |

The admin `audit_log` is the **system-wide** ledger (one row per
platform action). `Mod.AuditTrail` was designed for a **per-case**
audit pane — a different surface the admin app does not have yet (no
API, no DB query, no route).

## What S2 should do

Pick one resolution path before any of the three slots ship into the
admin app:

1. **Realign the compound to what shipped.** Expand `ModDecision` to
   include `'approve' | 'remove'` (or rename existing values),
   expand `ModQueueItem` with `complaintSlug` + `slaDueAt`, and
   replace `Mod.AuditTrail`'s per-case shape with the system-wide
   `AuditLogEntry`. Lowest friction; preserves all current UX.

2. **Realign the admin surface to the compound.** Add the per-case
   audit endpoint + DB query, rewrite the decision-form validator to
   the four-value vocabulary, and accept the loss of the SLA badge.
   Highest fidelity to the design system; biggest migration cost.

3. **Add a second surface.** Keep the existing admin pages as the
   operator console, and build a thinner "review queue" view that
   consumes `Mod.*` for community moderators or external review
   partners. The compound's narrower shape fits that audience.

Option 1 is the recommendation. Tracked in
`docs/action-plans/season-2/s2-action-plan.md` §5.5 (governance +
admin alignment workstream).

## What W7 actually shipped

- W7 is **not closed** — the admin compounds (`Mod.QueueList`,
  `Mod.DecisionBar`, `Mod.AuditTrail`) are not consumed by any app
  route. The other six items in the W3–M9 sweep landed cleanly.
- The Moderation surface is fully functional with the custom UI under
  `apps/web/src/features/admin/*`; no operator regression.

## Decision

Mark W7 as **deferred** with this note. Reopen during S2 Phase 5 once
one of the three resolution paths above is approved.
