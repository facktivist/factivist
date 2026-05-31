# Factivist S1 — HeroUI Compound Component Map

> **Phase 3 deliverable** (action plan §3.4). One source of truth for every
> compound that ships in S1 across web (HeroUI v3) and mobile (HeroUI Native).
> Implementation lives in Phase 5; this doc and the `*.types.ts` scaffolds
> in `packages/ui/{web,native}/src/<surface>/` lock the contract.
>
> Companion: [`token-lock.md`](./token-lock.md). Visual mirror lives in the
> Claude Design System workspace
> (<https://claude.ai/design/p/0c1a5806-5301-4221-856e-7320a124591b>) — this
> document is the spec; the workspace is the visual rendering.

## Conventions

- **Compound naming.** Dot-notation only: `Onboarding.VerifyStep`,
  `Complaint.Composer.PhotoTray`. Compound roots are `PascalCase`; child
  slots are `PascalCase` after the dot.
- **Variants.** Semantic only (`primary`, `secondary`, `danger`, `ghost`,
  `outline`). No raw color props.
- **States.** Every compound implements:
  `idle | loading | error | success | disabled`.
- **Tokens.** Compounds consume semantic tokens
  (`@factivist/ui-theme/semantic`), never primitive scales directly.
- **Anonymity.** Per ADR-010, no compound surfaces raw nullifier, name,
  address, photo of citizen, IP, or device fingerprint.
- **Web vs mobile.** Web compounds expose `className`; native compounds
  expose `style` + `accessibilityLabel` + `testID`. Domain props match
  one-for-one across platforms.

---

## Surface 1 — Onboarding + anoncitizen ZKP verification

Stub: `packages/ui/web/src/onboarding/Onboarding.types.ts` ·
`packages/ui/native/src/onboarding/Onboarding.types.ts`

| Compound | Children / Slots | Status states | Notes |
|---|---|---|---|
| `Onboarding.VerifyStep` | step content via `children` | idle, loading, error, success | Top-level controlled wrapper; consumer drives `step`. |
| `Onboarding.AadhaarCapture` | camera viewfinder + cancel | idle, loading, error | Surfaces `onCaptured({ opaqueToken })`; raw bytes never reach React. |
| `Onboarding.ProofProgress` | spinner / progress bar | loading | `stage = generating \| verifying \| anchoring`; indeterminate when no `progress`. |
| `Onboarding.SuccessConfirmation` | `handle`, `nullifierExcerpt`, continue CTA | success | Hard limit: only first 8 chars of nullifier; nothing else. |

Tokens: `surface`, `surfaceElevated`, `text`, `textMuted`, `brand`,
`brandText`, `border`, `ring`, `successBg`, `successText`, `dangerBg`,
`dangerText`, `space-{2,4,6,8}`, `radius-md`, `shadow-medium`,
`motion.duration.base`.

---

## Surface 2 — Complaint composer

Stub: `packages/ui/web/src/complaint/Complaint.types.ts` ·
`packages/ui/native/src/complaint/Complaint.types.ts`

| Compound | Children / Slots | Status states | Notes |
|---|---|---|---|
| `Complaint.Composer` | `PhotoTray`, `CategoryPicker`, `ConstituencyPicker`, body editor, `SubmitBar` (consumer composes) | idle, loading, error, success | Owns no state; React Hook Form + Zod in `packages/shared`. |
| `Complaint.PhotoTray` | up to 3 thumbnails + add | idle, loading, error | Per-photo `uploadState`: pending, uploading, uploaded, failed. |
| `Complaint.CategoryPicker` | 35 categories | idle, error | Single-select. Final taxonomy in `packages/shared/constants/categories`. |
| `Complaint.ConstituencyPicker` | state → district → constituency | idle, loading, error | Manual cascading (ADR-013). Web = dropdowns; mobile = stacked bottom sheets. |
| `Complaint.SubmitBar` | submit + draft + counter | idle, loading, disabled | Sticky-bottom. Mobile: keyboard-aware + safe-area inset. |

Tokens: `surface`, `surfaceElevated`, `text`, `textMuted`, `brand`,
`brandText`, `border`, `borderStrong`, `ring`, `infoBg`, `infoText`,
`dangerBg`, `dangerText`, `space-{2,3,4,6,8}`, `radius-{md,lg}`,
`shadow-{light,medium}`, `motion.duration.{fast,base}`.

---

## Surface 3 — Complaint detail (read, comment, flag)

Stubs: `Complaint.Card`, `Complaint.PhotoGallery`, `Complaint.FlagAction` in
`Complaint.types.ts`; `Comment.Thread` in `Comment.types.ts`.

| Compound | Children / Slots | Status states | Notes |
|---|---|---|---|
| `Complaint.Card` | title, excerpt, geo, badges, flag | idle | Used in detail header **and** in browse list. |
| `Complaint.PhotoGallery` | photo grid → lightbox | idle, loading | Read-only; mobile tap → swipe-able lightbox. |
| `Comment.Thread` | threaded `Comment` rows + reply composer | idle, loading, error | Depth derived from `parentId` chains; manual mod (ADR-006). |
| `Complaint.FlagAction` | trigger + dialog + reason picker | idle, loading, error, success | Two-step; reasons are a fixed enum. |

Tokens: `surfaceElevated`, `text`, `textMuted`, `border`, `radius-md`,
`space-{2,3,4}`, `dangerBg`, `dangerText`, `motion.duration.fast`.

---

## Surface 4 — Browse / filter

Stub: `packages/ui/web/src/filter/Filter.types.ts` + `Complaint.List` from
`Complaint.types.ts`.

| Compound | Children / Slots | Status states | Notes |
|---|---|---|---|
| `Filter.ConstituencyTree` | lazy tree | idle, loading | Single-select; `null` = all. |
| `Filter.CategoryChips` | scrollable chip row | idle | Multi-select; empty array = all. |
| `Filter.SortToggle` | segmented control | idle | `newest \| most-commented \| most-flagged`. |
| `Complaint.List` | virtualised `Complaint.Card` rows | idle, loading, empty | Web: `onLoadMore`. Native: `onEndReached`. |

Tokens: `surface`, `surfaceElevated`, `text`, `textMuted`, `border`,
`borderStrong`, `brand`, `accent`, `accentForeground`, `radius-{md,full}`,
`space-{2,3,4}`, `motion.duration.fast`.

---

## Surface 5 — Search results

Stub: `packages/ui/web/src/search/Search.types.ts`.

| Compound | Children / Slots | Status states | Notes |
|---|---|---|---|
| `Search.Bar` | input + clear + submit | idle, loading | Mobile: bound to the keyboard "search" action. |
| `Search.Results` | result list (`ComplaintSummary[]`) | idle, loading, empty | Backs onto Postgres FTS (ADR-005). |
| `Search.EmptyState` | copy + illustration | idle | `variant = no-query \| no-matches`. |

Tokens: `surface`, `surfaceElevated`, `text`, `textMuted`, `border`,
`ring`, `radius-md`, `space-{2,3,4}`, `motion.duration.fast`.

---

## Surface 6 — Citizen profile (no PII)

Stub: `packages/ui/web/src/profile/Profile.types.ts`.

| Compound | Children / Slots | Status states | Notes |
|---|---|---|---|
| `Profile.Handle` | handle + nullifier excerpt + copy | idle | First 8 chars of nullifier ONLY. |
| `Profile.Stats` | counts grid | idle, loading | `complaintCount`, `commentCount`, `flagsReceived`. |
| `Profile.ComplaintList` | `Complaint.Card` rows | idle, loading, empty | Reuses card; never shows author PII. |

Tokens: same family as Surface 4 (no new tokens).

---

## Surface 7 — Moderation queue (admin-only)

Stub: `packages/ui/web/src/moderation/Moderation.types.ts`. Native:
read-only mirror (write actions stay web-only until S2).

| Compound | Children / Slots | Status states | Notes |
|---|---|---|---|
| `Mod.QueueList` | pending items | idle, loading, empty | RBAC-gated route; never publicly reachable. |
| `Mod.DecisionBar` | keep / hide / delete / escalate + note | idle, loading | Append-only audit (ADR-006). |
| `Mod.AuditTrail` | chronological audit entries | idle, loading | Hash-chained in Phase 5. |

Tokens: `surface`, `surfaceElevated`, `text`, `textMuted`, `border`,
`borderStrong`, `dangerBg`, `dangerText`, `warningBg`, `warningText`,
`successBg`, `successText`, `radius-md`, `shadow-light`,
`space-{2,3,4}`.

---

## Surface 8 — Legal pages

Stub: `packages/ui/web/src/legal/Legal.types.ts`.

| Compound | Children / Slots | Status states | Notes |
|---|---|---|---|
| `Legal.Page` | masthead + MDX content + last-updated | idle | Variant `kind` drives which doc. |
| `Legal.GrievanceContact` | IT Rules 2021 officer card | idle | Required for monthly compliance report. |
| `Legal.ConsentBox` | per-purpose toggles | idle | DPDP §6(4) — withdrawal per purpose. |

Tokens: `surface`, `surfaceElevated`, `text`, `textMuted`, `border`,
`ring`, `radius-md`, `space-{2,3,4,6}`, `motion.duration.fast`.

---

## Surface 9 — App shell (mobile-first, web mirror)

Stub: `packages/ui/native/src/shell/Shell.types.ts`. Web mirror under
`packages/ui/web/src/shell/Shell.types.ts`.

| Compound | Children / Slots | Status states | Notes |
|---|---|---|---|
| `Shell.TabBar` | tab items + badge | idle | Mobile: true bottom bar w/ safe area. Web: top tab on md+. |
| `Shell.OfflineBanner` | message + retry | idle | `mode = offline \| cached-read-only`. |
| `Shell.SkeletonRow` | placeholder | loading | `lines`, `withAvatar`, `withThumbnail`. |

Tokens: `surface`, `surfaceElevated`, `text`, `textMuted`, `border`,
`borderStrong`, `brand`, `brandText`, `warningBg`, `warningText`,
`radius-{md,full}`, `space-{2,3,4}`, `shadow-medium`,
`motion.{duration.base, easing.standard}`.

---

## Web ↔ Mobile parity matrix

| Surface | Web compounds | Mobile compounds | Reuse | Mobile-only deltas |
|---|---|---|---|---|
| 1 Onboarding | 4 | 4 | All shapes identical | Camera-driven `AadhaarCapture`; safe-area on `VerifyStep`. |
| 2 Composer | 5 | 5 | All shapes identical | Picker UX (cascading dropdown → stacked sheet); keyboard-aware submit bar. |
| 3 Detail | 4 (incl. `Comment.Thread`) | 4 | All shapes identical | Reply composer in a bottom sheet; long-press action sheet. |
| 4 Browse | 4 | 4 | All shapes identical | Tree picker = stacked sheets; chip row = momentum scroll. |
| 5 Search | 3 | 3 | All shapes identical | Keyboard "search" action; `onEndReached` replaces `onLoadMore`. |
| 6 Profile | 3 | 3 | All shapes identical | None. |
| 7 Moderation | 3 (read+write) | 3 (read-only in S1) | List + audit reused | `DecisionBar` mobile shipping post-S1. |
| 8 Legal | 3 | 3 | All shapes identical | Native share sheet on `Legal.Page`. |
| 9 Shell | 3 | 3 | All shapes identical | True bottom tab; status-bar-aware banner; reduced-motion skeletons. |

**Compound count.** 32 compound entries per platform × 2 platforms = 64
prop interfaces locked.

---

## Adding a new compound

1. Decide which surface owns it. If none fits, propose a new surface
   first (must update action plan §3.1 and the surfaces docs from
   `ux-lead`).
2. Add the interface to the surface's `*.types.ts` in both
   `packages/ui/web/src` and `packages/ui/native/src`. Mirror shapes.
3. Add the slot identifier to the surface's `*_SLOTS` const so it shows
   up in tooling.
4. Update this document under the relevant surface section.
5. Open a PR; reviewer checks that token usage stays within the surface's
   declared list (or extends `token-lock.md` deliberately).
