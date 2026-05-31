# S1 User Flows — Cross-Surface

> Phase: 3 · Owner agent: `ux-lead` · Last edited: 2026-05-23
> Per-surface detail in `./surfaces/01..09-*.md`.

This document defines the four canonical journeys through the S1 surfaces.
Each flow names the surfaces traversed (S01..S09), the ATIDs that must hold
along the way, and the decision points where the user can be deflected.

---

## Flow 1 — First-time visitor → onboarding → first complaint

**Goal:** Convert a curious public reader into a verified contributor and
land them on their published complaint.

```
[ web landing or deep link ]
        │
        ▼
  S04 Browse (anonymous)               ←  default landing on web
        │                                  (mobile: same via Home tab)
        ▼
  S03 Complaint detail                 ←  reads a couple of complaints
        │                                  flag/comment actions are gated
        ▼  (taps "Sign in" or "Post")
        │
        ▼
  S01 Onboarding · Step 1 (Promise)    ←  ATID-IDENT-003 (no PII)
        │
        ▼
  S01 Onboarding · Step 2 (Consent)    ←  ATID-LEGAL-005
        │
        ▼
  S01 Onboarding · Step 3 (Scan QR)    ←  ATID-IDENT-001 / 004
        │
        ▼
  S01 Onboarding · Step 4 (Verify)     ←  ATID-IDENT-001 / 002
        │
        ▼
  S01 Success card  (handle revealed)
        │
        ▼
  S02 Complaint composer               ←  ATID-COMPL-001..007, LEGAL-010
        │
        ▼
  S03 Complaint detail (own)           ←  ATID-COMPL-007
```

**Decision points / deflections:**

- Step 2 (Consent) without ticking (a) — submit disabled.
- Step 3 — camera permission denied → fall back to upload.
- Step 4 — replay (ATID-IDENT-002) → 409 + link to `/legal/grievance`.
- Composer — submit auto-routed to moderation (`ATID-LEGAL-012`) → confirmation
  screen explaining the complaint is pending review, not yet public.

---

## Flow 2 — Returning verified citizen → browse → comment

**Goal:** Engage a returning citizen in another citizen's complaint.

```
[ web cookie / mobile session restore ]
        │
        ▼
  S04 Browse (verified)                ←  filter by constituency
        │
        ▼
  S05 Search (optional)                ←  query "potholes Forum Mall"
        │
        ▼
  S03 Complaint detail
        │
        ▼  (taps "Add a comment")
        │
        ▼
  S03 Comment composer (inline)        ←  ATID-COMMENT-001
        │
        ▼
  S03 Comment posted (optimistic)
```

**Decision points / deflections:**

- Session expired → modal "Sign in again" reroutes to S01 sign-in restore.
- Trying to flag (instead of comment) → opens `Complaint.FlagDialog` →
  204 → flag count increments → mod queue entry (`ATID-COMMENT-002`).
- The complaint was removed mid-read → `Common.RemovedNotice` (S03 state).

---

## Flow 3 — Admin → moderation queue → decision

**Goal:** A moderator clears flagged content within SLA.

```
[ admin signs in via Supabase auth ]
        │
        ▼
  /admin redirect (Shell.Admin)
        │
        ▼
  S07 Moderation queue                 ←  ATID-MOD-001 (RBAC + RLS)
        │
        ▼  picks the SLA-closest item
        │
        ▼
  S07 Queue card · "View full"
        │
        ▼
  S03 Complaint detail (admin view)    ←  ATID-MOD-002 (handle only)
        │
        ▼  returns to queue
        │
        ▼
  S07 RationaleField filled
        │
        ▼
  S07 DecisionActions: Remove / Keep / Escalate
        │
        ▼
  S07 ConfirmDialog (verifies intent)
        │
        ▼
  S07 Decision posted                  ←  ATID-MOD-003 (atomic)
        │
        ▼
  S07 Next queue item auto-scrolled
```

**Decision points / deflections:**

- Two moderators race on the same item → race-loser sees: "Decided by another moderator."
- Escalate → writes to `legal_orders` and re-routes to the senior reviewer (out of S1 scope to define UI; ticket follows).
- NCII flag → pinned to top with 24 h SLA + escalation strongly suggested (`ATID-LEGAL-004`).

---

## Flow 4 — Public reader (unverified) → browse → bounce or onboard

**Goal:** Honest fork — let public readers experience the platform's value,
then decide whether to verify.

```
[ web search engine entry or social share ]
        │
        ▼
  S03 Complaint detail (anonymous)     ←  ATID-COMPL-007 / DISC-005
        │
        ├─► User reads, leaves (bounce)
        │
        └─► Taps any gated action (Comment / Flag / Post)
              │
              ▼
        Soft paywall: "Sign in as a verified citizen to comment / flag / post."
              │
              ├─► User dismisses → continues reading (still allowed)
              │
              └─► User accepts → S01 Onboarding (Flow 1 continues from Step 1)
```

**Decision points / deflections:**

- Anonymous user attempts search with NSFW or doxxing terms — search still runs (we don't pre-judge queries), but `dev_metrics.search_queries` records the trimmed query for moderation-trend review.
- Anonymous user opens a removed complaint URL → `RemovedNotice` (no 404 — transparency).
- Anonymous user opens a pending complaint URL → 404-equivalent for non-author.

---

## Cross-flow invariants

| Invariant | Surfaces |
|-----------|----------|
| No PII ever rendered | S01, S03, S06, S07 (especially S07) |
| Disclaimer string verbatim above body | S02, S03 |
| Default sort is `created_at DESC` (no editorial rank) | S04, S03 (comments) |
| Photos served via signed URL ≤ 1 h TTL | S03, S07 |
| Moderation-pending rows hidden from non-admin | S03, S04, S05 |
| Removed rows surface `RemovedNotice`, not 404 | S03 |
| Annual ToS re-tick blocks any write until re-acknowledged | S02 (via S01 gate) |

---

## Observability

Each flow emits a single `funnel_step` row in `dev_metrics`:

| Flow | Steps | Conversion expectation (S1 pilot) |
|------|-------|----------------------------------|
| 1 — first-time → first complaint | `landing → onboard_consent → onboard_proof → onboard_success → compose → submit` | ≥ 25% landing → onboard_consent; ≥ 80% onboard_consent → success; ≥ 60% success → first submit. |
| 2 — returning → comment | `home → detail → comment_submit` | ≥ 8% detail → comment_submit. |
| 3 — admin → decision | `queue → decision` | ≥ 95% (operators are paid). |
| 4 — public bounce / onboard | `detail → soft_paywall → onboard_start` | ≥ 15% paywall → onboard_start. |

These thresholds are NOT KPIs — they are sanity baselines for the weekly scorecard.
