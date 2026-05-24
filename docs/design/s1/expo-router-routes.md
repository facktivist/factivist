# S1 Mobile — Expo Router Route Tree

> **Role:** mobile-designer (Phase 3 design swarm)
> **Audience:** Phase 5 mobile-dev / ui-templater agents; reviewers in Phase 4.
> **Scope:** Authoritative `apps/mobile/app/` file-system route tree for S1.
>   Maps each of the 9 S1 surfaces to a concrete file path. Phase 5 implementers
>   MUST follow this layout; deviations require ux-lead + mobile-designer
>   sign-off in code review.
> **Constraint:** Expo Router v3 (file-system routing), Expo SDK 53+, single
>   codebase Android + iOS (ADR-008).
> **Cross-link:** ux-lead flows live at [`docs/design/s1/surfaces/`](./surfaces/);
>   platform deltas at [`mobile-platform-deltas.md`](./mobile-platform-deltas.md).

---

## Top-level layout

```
apps/mobile/
├── app/                              # Expo Router root — file-system routes
│   ├── _layout.tsx                   # Root layout — providers, theme, netinfo, persistor
│   ├── +not-found.tsx                # 404 / unknown-link fallback
│   ├── +native-intent.tsx            # Deep-link normalization (Surface 9)
│   │
│   ├── (onboarding)/                 # Group — no URL prefix
│   │   ├── _layout.tsx               # Stack; gestureEnabled tuned per step
│   │   ├── index.tsx                 # Surface 1.1 — Welcome
│   │   ├── privacy.tsx               # Surface 1.2 — Privacy promise
│   │   ├── verify.tsx                # Surface 1.3 — Anoncitizen handoff
│   │   ├── proving.tsx               # Surface 1.4 — Proof progress (modal-sheet)
│   │   ├── success.tsx               # Surface 1.5 — Welcome citizen
│   │   └── biometric.tsx             # Surface 1.6 — Optional Face ID/biometric enable
│   │
│   ├── (tabs)/                       # Surface 9 — main app shell
│   │   ├── _layout.tsx               # Tabs (NavigationBar on Android / UITabBar on iOS)
│   │   ├── index.tsx                 # Browse (Surface 4) — default tab
│   │   ├── search.tsx                # Surface 5 — FTS search
│   │   ├── compose.tsx               # Surface 2 — Composer entry (modal-presents)
│   │   └── profile.tsx               # Surface 6 — Citizen profile
│   │
│   ├── complaint/
│   │   ├── _layout.tsx               # Stack
│   │   ├── [id].tsx                  # Surface 3 — Complaint detail (read/comment/flag)
│   │   ├── [id]/comments.tsx         # Surface 3.2 — Full comments thread (deep-link)
│   │   └── [id]/report.tsx           # Surface 3.3 — Report/flag action sheet
│   │
│   ├── compose/                      # Surface 2 — Composer (modal stack)
│   │   ├── _layout.tsx               # presentation: 'modal' on iOS, fullScreenModal on Android
│   │   ├── index.tsx                 # Step 1 — Text + category
│   │   ├── photos.tsx                # Step 2 — Photo selection (1–3)
│   │   ├── constituency.tsx          # Step 3 — State → District → Constituency drill-down
│   │   ├── review.tsx                # Step 4 — Final review before submit
│   │   └── submitted.tsx             # Step 5 — Success confirmation
│   │
│   ├── browse/
│   │   ├── _layout.tsx               # Stack
│   │   ├── filter.tsx                # Surface 4 — Filter modal (state/district/constituency/category)
│   │   └── [...filters].tsx          # Catch-all for shareable filter URLs
│   │
│   ├── admin/                        # Admin-only — RBAC-protected route group
│   │   ├── _layout.tsx               # Guards: redirect non-admin to (tabs)/index
│   │   ├── moderation.tsx            # Surface 7 — Mod queue list
│   │   ├── moderation/[id].tsx       # Surface 7.2 — Mod item detail
│   │   └── moderation/audit.tsx      # Surface 7.3 — Decision audit trail
│   │
│   ├── legal/                        # Surface 8 — In-app WebView for legal docs
│   │   ├── _layout.tsx               # Stack
│   │   ├── index.tsx                 # Legal index — links to each doc
│   │   ├── terms.tsx                 # ToS
│   │   ├── privacy.tsx               # Privacy policy
│   │   ├── zkp-explainer.tsx         # ZKP explainer (long-form)
│   │   └── grievance.tsx             # Grievance officer contact (IT Rules 2021)
│   │
│   └── settings/
│       ├── _layout.tsx               # Stack
│       ├── index.tsx                 # Settings home
│       ├── account.tsx               # Delete account / sign out
│       ├── notifications.tsx         # Notification prefs (S2 feature; placeholder in S1)
│       └── about.tsx                 # App version, build, OSS licenses
│
├── src/                              # Non-routing source code (features, hooks, lib)
│   ├── features/{identity,complaint,discovery,comment}/...
│   ├── lib/{api,zkp,storage,netinfo}/...
│   └── hooks/...
│
├── assets/
│   ├── legal/                        # Bundled HTML for Surface 8 (offline-cacheable)
│   │   ├── en/{terms,privacy,zkp,grievance}.html
│   │   └── hi/{terms,privacy,zkp,grievance}.html       # Hindi — S1 ships en + hi
│   ├── icons/                        # App icon variants
│   └── fonts/                        # Custom fonts (if any — prefer system)
│
└── app.config.ts                     # Expo config — permissions, deep-link schemes, splash
```

---

## Surface → route mapping

| # | Surface | Route(s) |
|---|---------|----------|
| 1 | Onboarding + anoncitizen ZKP | `/(onboarding)/index`, `.../verify`, `.../proving`, `.../success`, `.../biometric` |
| 2 | Complaint composer | `/compose` (modal stack: `/compose`, `/compose/photos`, `/compose/constituency`, `/compose/review`, `/compose/submitted`) |
| 3 | Complaint detail | `/complaint/[id]` (+ `/complaint/[id]/comments`, `/complaint/[id]/report`) |
| 4 | Browse / filter | `/(tabs)/index` + `/browse/filter` + `/browse/[...filters]` |
| 5 | FTS search | `/(tabs)/search` |
| 6 | Citizen profile | `/(tabs)/profile` (+ `/settings/*`) |
| 7 | Moderation queue | `/admin/moderation`, `/admin/moderation/[id]`, `/admin/moderation/audit` |
| 8 | Legal pages | `/legal/index`, `/legal/terms`, `/legal/privacy`, `/legal/zkp-explainer`, `/legal/grievance` |
| 9 | App shell + offline | `/(tabs)/_layout` (root tabs) + all `_layout.tsx` files + `+not-found.tsx` + `+native-intent.tsx` |

---

## Layout responsibilities

### `app/_layout.tsx` (root)

- Mount provider tree (top-down):
  1. `<SafeAreaProvider>`
  2. `<ThemeProvider>` (HeroUI Native theme; oklch tokens from `packages/ui/theme`)
  3. `<QueryClientProvider>` (TanStack Query with MMKV persistor)
  4. `<NetInfoProvider>` (custom — emits offline banner state)
  5. `<KeyboardProvider>` (react-native-keyboard-controller)
  6. `<AuthProvider>` (anoncitizen session restore)
  7. `<Stack screenOptions={{ headerShown: false }}>` — root stack
- Detect first-launch → redirect to `(onboarding)`.
- Detect signed-in → redirect to `(tabs)`.

### `app/(tabs)/_layout.tsx`

- `Tabs` component with 4 tabs (5 for admin role):
  - Browse (index)
  - Search
  - Compose (presents `/compose` modal — no embedded tab content)
  - Profile
  - Mod (admin only — conditional `<Tabs.Screen />`)
- Tab bar styling per platform (see `mobile-platform-deltas.md` Surface 9).
- `OfflineBanner` mounted just below the tab header.

### `app/(onboarding)/_layout.tsx`

- `Stack` with `headerShown: false` on welcome / privacy.
- `proving.tsx` opts into `presentation: 'modal'` + `gestureEnabled: false`
  (iOS) / intercepted back-press (Android) — both prevent mid-proof dismiss.

### `app/compose/_layout.tsx`

- `Stack` with:
  - iOS: `presentation: 'modal'`, `gestureEnabled: true` (draft auto-saves on dismiss).
  - Android: `presentation: 'fullScreenModal'`, predictive-back intercepted to confirm draft save.
- Header: "Compose" title + "Cancel" left-button. Draft auto-saves before dismiss.

### `app/admin/_layout.tsx`

- Reads `useAuth().role` — if `!== 'admin'`, `<Redirect href="/(tabs)" />`.
- All admin routes render inside this guarded layout.

### `app/legal/_layout.tsx`

- Each legal route renders `<WebView source={{ uri: bundledHtmlAsset }} />` —
  no network fetch, fully offline.
- Sticky table-of-contents overlay (web view content provides anchor IDs).

---

## Deep-link configuration

### URL scheme

- Primary: `https://factivist.app/...` (Universal Links iOS, App Links Android).
- Fallback: `factivist://...` (custom scheme).

### Deep-link routes (Surface 9)

| URL | Resolves to |
|-----|-------------|
| `factivist://complaint/<id>` | `/complaint/[id]` |
| `factivist://complaint/<id>/comments` | `/complaint/[id]/comments` |
| `factivist://browse?state=KA&district=BLR` | `/(tabs)/index` + filter state |
| `factivist://browse/<...filters>` | `/browse/[...filters]` |
| `factivist://legal/<doc>` | `/legal/[doc]` |
| `factivist://onboarding` | `/(onboarding)/index` (force restart onboarding — debug only) |

`+native-intent.tsx` normalizes inbound URLs (strip tracking params, validate
shape) before the router resolves them. Anything malformed → `+not-found.tsx`.

### Configuration in `app.config.ts`

```ts
{
  scheme: "factivist",
  ios: {
    associatedDomains: ["applinks:factivist.app"]
  },
  android: {
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: "factivist.app" }],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

---

## Route guards

| Route | Guard | On fail |
|-------|-------|---------|
| `(tabs)/*` | Authenticated session present | Redirect to `(onboarding)/index` |
| `compose/*` | Authenticated **and** verified citizen | Redirect to `(onboarding)/verify` |
| `admin/*` | Role === `admin` | Redirect to `(tabs)/index` |
| `complaint/[id]` | None (public read) — gated server-side by `S1_PUBLIC_BROWSE` flag | If flag off, show "Browse opens soon" empty state |
| `legal/*` | None (public, even offline) | N/A |

Guards live in each `_layout.tsx` via the `Redirect` component — no
global middleware.

---

## Modal vs push patterns

| Surface | Pattern | Why |
|---------|---------|-----|
| Onboarding | Push (stack) | Linear flow; back gesture allowed before proving |
| Onboarding/proving | Modal | Prevents accidental dismiss mid-proof |
| Composer | Modal | Distinct task; clearly separable from browse |
| Detail | Push (from browse/search) | Hierarchical |
| Filter | Modal (bottom-sheet on Android, pageSheet on iOS) | Reversible, not destructive |
| Report/flag | Action sheet (iOS) / bottom sheet (Android) | Per platform conventions |
| Settings | Push | Hierarchical, allows deep stacks |

---

## Notes for Phase 5 implementers (mobile-dev, ui-templater)

- DO NOT add a route file without updating this document AND the matching
  ux-lead surface spec.
- DO NOT use `react-navigation` directly — Expo Router wraps it; bypassing the
  file-system convention breaks deep-link resolution.
- Splash screen handoff: `<SplashScreen.hideAsync()>` called inside root layout
  ONLY after auth state + persisted-query rehydration both resolve.
- Test deep-link routes with Argent MCP `launch-app` with `--url
  factivist://complaint/<id>` (per `argent-device-interact` skill) before
  merging any change to `+native-intent.tsx`.

---

## Open questions for ux-lead / architect

1. **Tab order** — final order of bottom tabs (Browse, Search, Compose,
   Profile). Compose typically gets center position with elevated FAB-style
   button on Android; iOS HIG keeps it inline. Lock in Phase 3 review.
2. **Should `compose/photos.tsx` and `compose/constituency.tsx` be modals
   nested inside the composer modal?** Nested modals are technically allowed
   (Expo Router supports them) but UX is debated. Default: keep them as stack
   pushes inside the composer modal — one modal layer total.
3. **Admin tab — show or hide for non-admins?** Currently conditional render.
   Alternative: always show as locked badge. Defaulting to conditional render
   for cleaner UI; revisit if discoverability needed.
