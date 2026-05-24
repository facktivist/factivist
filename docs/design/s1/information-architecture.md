# S1 Information Architecture — Site map · Mobile nav · Deep links

> Phase: 3 · Owner agent: `ux-lead` · Last edited: 2026-05-23

---

## 1. Web site map

```
/  (Home — same as /browse with no filter)
│
├── /browse                                       (S04)
│   ├── ?state=KA                                 cascading query params
│   ├── ?state=KA&district=BLR-U
│   ├── ?state=KA&district=BLR-U&pc=BLR-S
│   └── ?state=KA&district=BLR-U&pc=BLR-S&ac=BTM-LAYOUT
│
├── /search                                       (S05)
│   └── ?q=potholes&state=KA
│
├── /complaints/:slug                             (S03)
│
├── /citizens/:handle                             (S06)
│
├── /onboarding                                   (S01)
│   ├── /step/promise
│   ├── /step/consent
│   ├── /step/scan
│   └── /step/verify
│
├── /sign-in                                      (lightweight S01 — restore session)
│
├── /me                                           (redirects to /citizens/:own-handle if verified)
│
├── /post                                         (gated → S02 or S01)
│
├── /legal                                        (S08 index)
│   ├── /legal/tos
│   ├── /legal/privacy
│   ├── /legal/zkp-explainer
│   └── /legal/grievance
│       └── /confirmation?id=...
│
├── /admin                                        (S07 — RBAC gated)
│   ├── /admin/moderation
│   ├── /admin/decisions
│   └── /admin/audit
│
├── /about
│
└── /not-found  (404)
    /removed    (410 - alias for removed slugs surfaced through S03 state)
```

Footer on every public page links to:
`Browse · Search · Terms · Privacy · ZKP · Grievance · About`

Header on every public page contains:
`Logo` · `Browse` · `About` · `Legal ▾` · `Search (omni)` · `{handle | Sign in}`

---

## 2. Mobile navigation map

```
RootNavigator (Shell.RootNavigator — Expo Router)
│
├── Tab "Home"      → Stack
│   ├── Browse (S04, root)
│   └── Complaint detail (S03, push)
│
├── Tab "Search"    → Stack
│   ├── Search (S05, root, omni focused)
│   └── Complaint detail (S03, push)
│
├── Tab "Post"      → Stack
│   ├── if verified → Complaint composer (S02, root)
│   ├── if not     → Onboarding (S01, root)
│   └── Confirmation (push after submit)
│
└── Tab "Me"        → Stack
    ├── if verified → Own profile (S06, root)
    ├── if not     → Anonymous CTA card (root, links to Onboarding)
    ├── More → Stack
    │   ├── Settings  (very small in S1: re-tick ToS, sign out)
    │   ├── Legal index (S08 in webview-style native screen)
    │   └── About
    └── Sign out
```

No hamburger menu. No drawer. Tabs are the only top-level nav.

---

## 3. Tab bar specification (mobile)

| Tab | Icon (proposal) | Label | Default root | Verified-only? |
|-----|-----------------|-------|--------------|----------------|
| Home | `home` (HIG) / `home` (M3) | `Home` | S04 Browse | no |
| Search | `magnifying-glass` / `search` | `Search` | S05 Search | no |
| Post | `plus.app` / `add-box` | `Post` | S02 if verified, S01 if not | gated; tab always visible to make verification discoverable |
| Me | `person.crop.circle` / `person` | `Me` | S06 if verified, anon CTA if not | no |

Hidden / collapsed:
- Notifications tab — **deferred to S2**.
- Activity tab — **deferred to S2**.

---

## 4. Deep-link patterns

All deep links work on web (https://factivist.in/...) AND mobile (factivist://...).

| Scheme | Routes to |
|--------|-----------|
| `https://factivist.in/` | S04 Browse |
| `https://factivist.in/browse?state=...` | S04 with filter |
| `https://factivist.in/search?q=...` | S05 |
| `https://factivist.in/complaints/:slug` | S03 |
| `https://factivist.in/citizens/:handle` | S06 |
| `https://factivist.in/onboarding` | S01 |
| `https://factivist.in/post` | S02 (gated) |
| `https://factivist.in/legal/*` | S08 (server-rendered) |
| `https://factivist.in/admin/*` | S07 (RBAC) |
| `factivist://complaint/:slug` | S03 |
| `factivist://browse?...` | S04 |
| `factivist://search?q=...` | S05 |
| `factivist://citizen/:handle` | S06 |
| `factivist://onboarding` | S01 |

Universal Links (iOS) and App Links (Android) are configured for `factivist.in` so social shares open the app on devices where it's installed, falling back to the SSR web pages elsewhere.

---

## 5. URL design rules

- **Codes, not slugs**, for constituency parameters (`state=KA` not `state=karnataka`) so delimitation events don't break links.
- **Slugs** for complaints (`/complaints/potholes-100ft-bm-2026-may`) for SEO + readability. Generated server-side from title + complaint_id prefix.
- **Handles** for citizens (`/citizens/bldr7q9p2x`), never UUIDs. (per ADR-010)
- **No query strings for sensitive data.** A complaint's photo URLs use signed URLs returned in the JSON payload, never in the page URL.
- **No referrer leakage** — outbound links on user-generated content carry `rel="noopener noreferrer"`.

---

## 6. Routing hierarchy summary

| Concern | Strategy |
|---------|----------|
| Auth gating | Server middleware (`apps/web/src/middleware.ts`); on mobile, `Shell.RootNavigator` reads session and redirects per tab. |
| RBAC for admin | Supabase RLS + middleware; client routes are a defence-in-depth only. |
| Feature flags | `feature_flags` table read once per request on web, once per app launch on mobile (with TanStack refetch on focus). |
| 404 vs 410 | 404 for unknown slugs; 410-equivalent for `status='removed'` rows surfaced via S03's `RemovedNotice`. |
| Pending complaints | 404-equivalent for non-author; full view for author with `PendingNotice`. |

---

## 7. Cross-app dependency note

`apps/web` and `apps/mobile` consume the **same** Zod-validated route params from `packages/shared/src/routes/`. Any addition or rename there is a breaking change for both surfaces — schedule via `architect` agent.
