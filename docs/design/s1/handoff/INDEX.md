# Claude Design Handoff — S1 Implementation Inventory

> Generated 2026-05-26 from the two Claude Design handoff bundles fetched via
> the design system + product design "Handoff to Claude Code" links.
>
> This file is the **map** between the design artefacts and the Factivist
> monorepo. Every S1 surface row tells a future agent exactly where to find
> the visual reference, the existing implementation, and the compound it
> needs to feed.

---

## Bundle inventory

### Design System bundle — `./design-system/hero-design-system/`

| Path | Use |
|------|-----|
| `README.md` | Agent-facing handoff instructions (read first) |
| `chats/chat1.md` | Design iteration log — token decisions, voice/tone, component vocabulary |
| `project/README.md` | Brand, voice, tone, content fundamentals |
| `project/SKILL.md` | Agent-Skill manifest |
| `project/colors_and_type.css` | **Canonical token CSS** — primitives + semantic aliases + typography + spacing + radius + shadow + motion |
| `project/preview/` | Token preview cards (typography, color, spacing, components) |
| `project/ui_kits/web/` | High-fidelity click-through web mocks |
| `project/ui_kits/mobile/` | Android-first mobile mocks (verify-ZKP, feed, detail) |
| `project/fonts/` | Inter + JetBrains Mono variable fonts |

### Product Design bundle — `./product-design/factivist-s1/`

| Path | Use |
|------|-----|
| `README.md` | Agent-facing handoff instructions (read first) |
| `chats/chat1.md` + `chats/chat2.md` | Surface-level iteration log — wireframe decisions, state variants, mobile/web alignment |
| `project/README.md` | Surface inventory + screen-to-spec mapping |
| `project/Factivist - Screens.html` | Canvas — every surface laid out side-by-side, web + mobile artboards aligned |
| `project/screens/*.jsx` | One JSX prototype per surface; this is what gets reimplemented |
| `project/design-system/` | Shared partials the screen prototypes import (icons, layout helpers, android frame, color CSS, data fixtures) |
| `project/uploads/product-vison.md` | Strategic blueprint mirror |

> Excluded from the repo to keep size sane:
> `uploads/india-assembly-constituencies.topo.json` + `data/india-acs.topo.json`
> (3.2 MB each; not S1 scope).

---

## S1 surface → implementation map

Every row points at the JSX prototype, the Phase 3 spec, the existing app
code, the compound stub that needs the JSX-driven implementation, and a
status. Status legend:

- **STUB** — types-only contract in `packages/ui/{web,native}/src/<surface>/<Surface>.types.ts`; no `.tsx` implementation.
- **PARTIAL** — `.tsx` exists in `apps/{web,mobile}/src/features/...` but does not feed through the `packages/ui` compound.
- **WIRED** — `apps/*/src/features/...` consumes `packages/ui/<platform>/src/<surface>/<Surface>.tsx` exports.

| # | Surface | Phase 3 spec | JSX prototype(s) | Existing app code | Compound stub | Status |
|---|---------|--------------|------------------|-------------------|---------------|--------|
| S01 | Onboarding + ZKP verify | [`docs/design/s1/surfaces/01-onboarding.md`](../surfaces/01-onboarding.md) | `screens/web-onboarding.jsx` · `screens/onboarding-mobile.jsx` | `apps/web/src/features/identity/{IdentityShell,VerifyForm}.tsx` · `apps/mobile/src/features/identity/{IdentityScreen,VerifyButton}.tsx` | `packages/ui/{web,native}/src/onboarding/Onboarding.types.ts` | STUB |
| S02 | Complaint composer | [`02-complaint-composer.md`](../surfaces/02-complaint-composer.md) | `screens/complaint-register.jsx` · `screens/media-capture.jsx` | `apps/web/src/features/complaint/*` · `apps/mobile/src/features/complaint/*` | `packages/ui/{web,native}/src/complaint/Complaint.types.ts` | PARTIAL |
| S03 | Complaint detail | [`03-complaint-detail.md`](../surfaces/03-complaint-detail.md) | `screens/complaint-view.jsx` · `screens/evidence-viewer.jsx` · `screens/comments.jsx` | `apps/web/src/features/complaint/*` (detail view) | `Complaint.types.ts` + `Comment.types.ts` | PARTIAL |
| S04 | Browse + filter | [`04-browse-filter.md`](../surfaces/04-browse-filter.md) | `screens/discovery.jsx` · `screens/landing.jsx` (feed) | `apps/web/src/features/discovery/*` · `apps/mobile/src/features/discovery/*` | `packages/ui/{web,native}/src/filter/Filter.types.ts` | PARTIAL |
| S05 | Search results | [`05-search-results.md`](../surfaces/05-search-results.md) | `screens/search-results.jsx` | `apps/web/src/features/discovery/*` (search) | reuses `Filter.types.ts` + `Complaint.types.ts` | STUB |
| S06 | Citizen profile | [`06-citizen-profile.md`](../surfaces/06-citizen-profile.md) | `screens/profile-me.jsx` · `screens/notifications.jsx` · `screens/notification-prefs.jsx` | `apps/web/src/app/profile/*` | `packages/ui/{web,native}/src/profile/Profile.types.ts` | STUB |
| S07 | Moderation queue + grievance | [`07-moderation-queue.md`](../surfaces/07-moderation-queue.md) | `screens/moderation.jsx` · `screens/critical-escalation.jsx` · `screens/resolution-attestation.jsx` | `apps/web/src/features/admin/*` | `packages/ui/{web,native}/src/moderation/Moderation.types.ts` + `Admin.types.ts` | PARTIAL |
| S08 | Legal pages | [`08-legal-pages.md`](../surfaces/08-legal-pages.md) | (text in `chats/chat1.md` §"legal stack"; no dedicated JSX — composed from `shared.jsx` + `partials.jsx`) | `apps/web/src/app/legal/*` (if present) | `packages/ui/{web,native}/src/legal/Legal.types.ts` | STUB |
| S09 | App-shell (mobile) | [`09-app-shell-mobile.md`](../surfaces/09-app-shell-mobile.md) | `screens/mobile-tier1.jsx` · `screens/mobile-companions.jsx` · `screens/mobile-partials.jsx` | `apps/mobile/app/_layout.tsx` · `apps/mobile/app/(tabs)/*` | `packages/ui/native/src/shell/Shell.types.ts` | PARTIAL |

### Out of S1 scope (deferred to S2+)

The product-design bundle contains many surfaces beyond the S1 nine. These
JSX prototypes live in the bundle for future reference but are **not** wired
into the monorepo:

`accused.jsx`, `ai-chat.jsx`, `analytics.jsx`, `constituency.jsx`,
`india-map.jsx`, `judicial.jsx`, `promise-tracking.jsx`, `report-card.jsx`,
`shame-index.jsx`, `shareable-card.jsx`, `shareable-complaint.jsx`,
`undertrial.jsx`, `empty-and-endorse.jsx` (endorse half).

Do not implement these in S1. Track them in [`docs/action-plans/s2-action-plan.md`](../../../action-plans/s2-action-plan.md) when it exists.

---

## Token reconciliation (Wave 0a)

`packages/ui/theme/src/tokens/colors.ts` was updated 2026-05-26 to mirror
`tooling/tailwind-config/index.css` (the CSS canon) byte-for-byte. The
handoff CSS at
`./design-system/hero-design-system/project/colors_and_type.css` carries
the same values. Future drift: change one → change all three in the same
commit.

Pinned by `__tests__/colors.test.ts`: brand 500 is `oklch(0.55 0.20 250)`.
The other values are checked structurally (valid oklch, 11 steps,
monotonic L ladder) and can be refined without breaking tests.

---

## Implementation order

Surfaces are being implemented in this order (one commit per surface).
The order minimises cross-package conflicts and front-loads the most
ZKP-critical surface:

1. **S01 Onboarding** — most spec'd, blocks the production flow
2. **S02 Composer** — second most spec'd, depends on shared `Filter.types`
3. **S03 Detail** — reuses `Complaint.Card` from S02
4. **S04 Browse** — feed reuses `Complaint.Card` from S03
5. **S05 Search** — thin layer on top of `Filter` + `Complaint.Card`
6. **S07 Moderation** — operator-only; isolated from citizen surfaces
7. **S06 Profile** — depends on `Notification.*` which is new
8. **S09 App-shell** — locks the mobile navigation contract
9. **S08 Legal** — static text; composed from common primitives

Each surface commit:
- Implements the `.tsx` compound in `packages/ui/{web,native}/src/<surface>/`
- Migrates the existing `apps/{web,mobile}` screen to consume it
- Carries a vitest test file with ≥95% line + ≥90% branch coverage
- Uses semantic tokens (`@factivist/ui-theme/semantic`), never primitives
- Passes `bun run check` 38/38
- Has a commit message that names every compound + every screen touched

---

## How to use this inventory (for the next agent that picks it up)

1. Pick the next surface marked **STUB** or **PARTIAL** from the table.
2. Open its JSX prototype(s) in `./product-design/factivist-s1/project/screens/`.
3. Open the Phase 3 spec listed under "Phase 3 spec".
4. Open the existing app code listed under "Existing app code" — match
   prop shapes; don't rename without reason.
5. Open the compound stub — these `*.types.ts` files lock the public
   contract. Implement against them; only widen the contract with
   reason.
6. Run `bun run check` after each test added; don't accumulate failures.
7. Commit per surface, never bundle multiple surfaces into one commit.

When all 9 are **WIRED**, run the Phase 6 Playwright + Detox suites
against the migrated screens and update [`docs/design/s1/a11y-baseline.md`](../a11y-baseline.md) if any axe-core
contract changed.
