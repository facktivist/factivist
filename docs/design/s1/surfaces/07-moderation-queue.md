# Surface 07 — Moderation queue (admin-only)

> Tracking issue: [#30](https://github.com/raveracker/factivist/issues/30)
> Implementation issues: [#65 table+API](https://github.com/raveracker/factivist/issues/65), [#66 admin UI](https://github.com/raveracker/factivist/issues/66), [#77 adversarial tests](https://github.com/raveracker/factivist/issues/77), [#96 RLS](https://github.com/raveracker/factivist/issues/96)
> Phase: 3 · Owner agent: `ux-lead`
> Last edited: 2026-05-23

## Summary

Operator-only admin surface for triaging flagged complaints. Behind the
`admin` role claim (Supabase RLS denies all other reads). Web-only in S1
(no mobile parity for the admin role — operators sit on a desktop). Shows
flag reason, complaint preview, photos, flag count, time-in-queue, and the
three primary decisions: **Remove · Keep · Escalate** with a free-text
rationale. Crucially, the **moderator never sees who the author is** —
only `author_handle`.

## User story

> **As an** authorised Factivist moderator
> **I want to** triage flagged complaints within the SLA windows (24 h flag, 36 h actual-knowledge, 15 d grievance)
> **So that** unlawful or false content is removed while preserving the §79 safe-harbour and the citizen's anonymity.

## ATIDs gated

| ATID | What this surface must guarantee |
|------|-----------------------------------|
| `ATID-MOD-001` | Non-admin → 403 + RLS denies row read; admin → paginated pending items. |
| `ATID-MOD-002` | Author identity hidden — only `author_handle`; adversarial test fails on any new column. |
| `ATID-MOD-003` | Decision appended to `moderation_actions` atomically; SLA monitor for defamation 24 h, actual-knowledge 36 h. |
| `ATID-MOD-004` | New flag appears in queue within 1 s; flag count increments. |
| `ATID-LEGAL-013` | Defamation flag uses 24 h SLA (Factivist house policy, tighter than 36 h ceiling). |
| `ATID-LEGAL-012` | Sensitive-zone auto-queued before publication. |

## Layout — WEB (admin only)

```
┌──────────────────────────────────────────────────────────────────────┐
│  factivist · ADMIN          [Queue]  [Decisions]  [Audit]   admin ▾  │
├──────────────────────────────────────────────────────────────────────┤
│  Moderation queue                          ⓘ Operators-only          │
│                                                                      │
│  Filters: [ All flags ▾ ]  [ All categories ▾ ]  [ Sort: SLA ▾ ]     │
│  Status:  [ Pending (24) ] [ Removed (3) ] [ Escalated (1) ]         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 🔴 SLA: 23h 14m left      Defamation flag (×3)               │    │
│  │ Complaint #c-a1b2  ·  KA · BLR-U · BLR-S · BTM Layout        │    │
│  │ "Potholes on 100ft Road near Forum Mall — alleging that…"    │    │
│  │ Author: bldr7q9p2x  · 7 prior complaints  · joined 11 d ago  │    │
│  │ [ View full ]   [ Photos (3) ]                               │    │
│  │                                                              │    │
│  │ Recent flag notes:                                           │    │
│  │   "Names a person without evidence." — by xyz4q8…            │    │
│  │   "Defamatory."                       — by abc1p2…           │    │
│  │                                                              │    │
│  │ Rationale (required):                                        │    │
│  │ ┌──────────────────────────────────────────────────────────┐ │    │
│  │ │                                                          │ │    │
│  │ └──────────────────────────────────────────────────────────┘ │    │
│  │                                                              │    │
│  │ [ 🗑 Remove ]   [ ✓ Keep ]   [ ⤴ Escalate ]                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ 🟡 SLA: 32h 02m left      Communal flag (×1)                 │    │
│  │ Complaint #c-d4e5  · …                                       │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [ ← Prev ]                page 1 of 2                 [ Next → ]   │
└──────────────────────────────────────────────────────────────────────┘
```

NCII rows are pinned to the top with a red border + 24 h SLA timer (`ATID-LEGAL-004`).

## Layout — MOBILE

**Not provided in S1.** The admin surface is web-only. Mobile redirect:
"Moderation tools are available on desktop only."

## Information architecture

1. **Filter bar** — flag reason, category, sort (default: SLA-closest).
2. **Status tabs** — Pending / Removed / Escalated (with counts).
3. **Queue items** — each is a self-contained decision unit.
   - SLA timer (colour: red < 6 h, amber < 24 h, green > 24 h).
   - Flag summary + flag count.
   - Complaint snippet (≤ 200 chars) + view-full link.
   - Author summary — handle, prior complaint count, join age (NO PII).
   - Photo tray.
   - Recent flag notes (each tagged by **truncated** flagger handle).
   - Rationale textarea (required for any action).
   - Three action buttons.

Hidden:
- Detailed audit log (separate `Audit` tab).
- Decision history per complaint (link to detail page within admin shell).

## Copy

| Slot | Copy |
|------|------|
| Page title | `Moderation queue` |
| Operators-only note | `This page is restricted to authorised Factivist moderators.` |
| SLA — red | `< {N}h left — defamation 24h policy / actual-knowledge 36h ceiling` |
| SLA — overdue | `Overdue by {N}h — breach logged` |
| Remove button | `Remove` |
| Keep button | `Keep` |
| Escalate button | `Escalate` |
| Escalate destination | `Sends to senior reviewer + legal log entry.` |
| Rationale required error | `Add a one-line rationale before deciding.` |
| Confirmation modal — remove | `This will hide the complaint immediately and notify the author via the Grievance route. Proceed?` |
| Confirmation modal — escalate | `Escalation creates a legal_orders draft entry. Proceed?` |
| Success — remove | `Removed. Complaint status set to 'removed' and decision logged.` |
| Success — keep | `Kept. Decision logged. Complaint remains published.` |

## Components used

- `Admin.Shell` (admin-only chrome with restricted nav)
- `Admin.RBACGuard` (server component; redirects non-admin)
- `Moderation.QueueList`
- `Moderation.QueueCard`
- `Moderation.SlaBadge`
- `Moderation.FlagSummary`
- `Moderation.FlagNoteList`
- `Moderation.AuthorSummary` (handle + counts ONLY; no PII)
- `Moderation.PhotoTray` (reuses `Complaint.PhotoGallery` in mod-context)
- `Moderation.DecisionActions` (the three buttons)
- `Moderation.RationaleField`
- `Moderation.ConfirmDialog`
- `Admin.AuditLogTable` (separate tab, not on the queue itself)

## States

| State | Trigger | Behaviour |
|-------|---------|-----------|
| Loading | SSR | Skeleton queue. |
| Empty | No pending flags | "All clear. Queue is empty." with link to Audit tab. |
| Error — 403 | Non-admin somehow reached the route | Redirect to `/` with toast: "Access denied." |
| Error — race | Two mods acting on the same item | Show: "This item was decided by another moderator at {time}. Refresh to see the next." |
| Success | Decision posted | Item collapses with a confirmation strip; next pending item scrolls into view. |
| Overdue | SLA breach | Item still rendered; red banner; audit log captures the breach automatically. |

## Edge cases

- Two moderators decide on the same item simultaneously — DB enforces `moderation_actions` PK constraint on `(complaint_id, decided_at)`; second action fails with 409; UI surfaces the race-loser case.
- Moderator's session expires mid-decision — local draft of rationale saved to sessionStorage; on re-auth, restored.
- A flagged complaint is edited by the author — **not supported** in S1 (no complaint editing). If it were, mod queue would need a "snapshot" view.
- Photo gallery shows EXIF-stripped JPEGs — moderator cannot infer the author's location from photos (defence-in-depth on top of `ATID-COMPL-002`).
- NCII flagged content — pinned, 24 h SLA, requires escalation flag too.

## Anonymity invariants (per ADR-010 — STRICTLY ENFORCED HERE)

Even with `admin` role, this surface MUST NOT render:

- Aadhaar number / name / DOB / PIN / address / contact / photo of citizen.
- IP / user-agent / device fingerprint / session cookie.
- Raw `nullifier` (only the handle).
- `citizen_id` UUID (used in queries but stripped from response).
- Flagger's full handle — show **truncated** prefix only (e.g., `xyz4q8…`) to discourage retaliatory profiling.

The adversarial test in `ATID-P5C6` (#70) gates every PR touching this surface or the underlying API.

## Legal hooks

- **§79(3)(b)** — actual knowledge starts at 0 when a flag lands or a notification arrives; this UI gives operators the receipts to evidence dispatch within 36 h.
- **Rule 3(1)(d)** — 36 h ceiling; Factivist house policy is 24 h for defamation (`ATID-LEGAL-013`).
- **Rule 3(2)** — escalation path writes to `legal_orders` for §69A / court-ordered takedowns (`ATID-LEGAL-009`).
- **NCII Rule 3(2)(b)** — 24 h SLA for `category='ncii'` (`ATID-LEGAL-004`).

## Open questions

1. Should we expose a "Why this was flagged" auto-summary (per-flag-reason aggregation) at the top of each card? Marginal cognitive load reduction; recommend yes.
2. Should moderators be able to message the author (anonymously) through the system? Privacy-conservative answer: no — keep moderation one-way; let the author use the grievance form.
3. NCII workflow — should escalation auto-CC `cert-in@cert-in.org.in` per `ATID-LEGAL-008` runbook, or remain manual in S1? Recommend manual + runbook-led in S1 to avoid premature automation.
