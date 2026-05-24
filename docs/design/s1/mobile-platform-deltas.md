# S1 Mobile Platform Deltas — iOS HIG ↔ Android Material 3

> **Role:** mobile-designer (Phase 3 design swarm)
> **Scope:** Native parity for the 9 S1 surfaces per
> [`docs/action-plans/season-1/s1-action-plan.md`](../../action-plans/season-1/s1-action-plan.md) §3.
> **Base spec:** ux-lead's per-surface specs at [`docs/design/s1/surfaces/`](./surfaces/)
> (cross-link; this doc is the **delta**, not the base).
> **Stack constraint:** Expo + Expo Router; single codebase; 100% business-logic
> sharing per ADR-008. HeroUI Native + Uniwind (Tailwind v4 in RN). NativeWind
> migrations forbidden.
> **ZKP proving:** Hybrid per ADR-011 — see [`mobile-zkp-proving-ux.md`](./mobile-zkp-proving-ux.md).

---

## How to read this document

For every S1 surface, this doc lists the **platform-specific deviations** from
ux-lead's base spec. The base spec defines the screen content, copy, IA, and
the HeroUI compound component map. This doc defines:

- **iOS variant** — what the iOS user sees / feels (HIG)
- **Android variant** — what the Android user sees / feels (Material 3)
- **One codebase rule** — what code branches (via
  `Platform.select` / `Platform.OS`) vs. what stays shared

Anything not listed is identical across platforms — that is the default and is
the goal. Branching is a cost; we only pay it where the OS forces our hand.

---

## Surface 1 — Onboarding + anoncitizen ZKP verification

Base flow (ux-lead): welcome → privacy promise → "Verify you're a unique
Indian citizen" → anoncitizen QR scan / app handoff → proof generation →
nullifier registered → app entry.

### iOS (HIG)

| Concern | iOS behavior |
|---------|--------------|
| Biometric gate (post-verify) | `LocalAuthentication.framework` Face ID / Touch ID via `expo-local-authentication`. Modal **system sheet** appears; native, not custom. App icon shown in prompt. |
| `Info.plist` rationale | `NSFaceIDUsageDescription` = "Factivist locks your app with Face ID so even if someone unlocks your phone, your draft complaints stay private." (≤ 150 chars; App Review rejects vague strings.) |
| Proof-progress screen | **Modal sheet** (`presentationStyle: pageSheet`), respects grab-handle dismiss gesture but we **disable swipe-to-dismiss** during proving (set `gestureEnabled: false` in Expo Router options). Reason: cancelling mid-proof corrupts witness; user must tap the explicit Cancel button. |
| Safe area | Top: notch + Dynamic Island. Use `useSafeAreaInsets()` for top inset; never hardcode `44`. Bottom: home-bar 34pt inset; primary CTA never lower than `inset.bottom + 16`. |
| Status bar | `light-content` over the brand hero, `dark-content` after step 2 (light card surfaces). Use `expo-status-bar` `<StatusBar style="auto" />` with manual override per step. |
| Haptics | `Haptics.notificationAsync(Success)` on proof-complete; `Haptics.notificationAsync(Error)` on proof-fail. |

### Android (Material 3)

| Concern | Android behavior |
|---------|------------------|
| Biometric gate | `androidx.biometric.BiometricPrompt` via `expo-local-authentication` (same API, different system UI). Prompt is **bottom sheet** on M3 devices. |
| `AndroidManifest.xml` | `<uses-permission android:name="android.permission.USE_BIOMETRIC"/>` + `<uses-permission android:name="android.permission.USE_FINGERPRINT"/>` (legacy fallback for API < 28). |
| Proof-progress screen | **Bottom sheet** (Material 3 `BottomSheet`). Drag handle visible but `isDismissable={false}` during proving. Back-press intercepted (`useFocusEffect` + `BackHandler.addEventListener`) — must show "Cancel proving?" confirm dialog, not silent dismiss. |
| Safe area | Display cutout (notch on Pixel 6+, etc.) + nav-bar. `expo-navigation-bar` to set translucent nav with proper inset awareness. Edge-to-edge per Android 15+ default. |
| Status bar | M3 dynamic theming — but we **do not** opt into Material You dynamic color in S1 (brand identity must stay constant). Force-set status bar to brand color via `StatusBar.setBackgroundColor`. |
| Haptics | `Haptics.notificationAsync` on Android falls back to vibration patterns (`expo-haptics` handles this); no behavioral change at app layer. |

### Shared / one-codebase

- Anoncitizen handoff (QR scan + deep-link return) is **identical** — Expo Linking handles both schemes.
- Proof generation logic (server-side default, see [`mobile-zkp-proving-ux.md`](./mobile-zkp-proving-ux.md)) is platform-agnostic.
- Copy + icon + brand color tokens — fully shared via `packages/ui/theme`.

---

## Surface 2 — Complaint Composer (text + 1–3 photos + category + constituency)

### iOS (HIG)

| Concern | iOS behavior |
|---------|--------------|
| Photo picker | **PHPicker** via `expo-image-picker` with `mediaTypes: ['Images']`, `selectionLimit: 3`, `allowsEditing: false`. PHPicker runs **out-of-process** — we get **zero photo-library permission prompt** by default (this is the modern HIG path). |
| Heic handling | iOS gives us HEIC by default. We MUST convert to JPEG client-side via `expo-image-manipulator` (`SaveFormat.JPEG`, quality 0.85) **before** upload — server doesn't accept HEIC (Sharp can transcode but we save bandwidth on cellular). |
| Camera path | If user taps "Take photo" inside picker: same flow, no extra branch. `expo-camera` reserved for S2 in-app capture. |
| `Info.plist` rationale | `NSPhotoLibraryUsageDescription` = "Factivist needs access only when you choose photos for a complaint. We never browse your library." `NSCameraUsageDescription` = "Factivist uses your camera only when you tap 'Take photo' inside a complaint." (Both ≤ 150 chars.) |
| Keyboard avoidance | `KeyboardAvoidingView` with `behavior="padding"`, `keyboardVerticalOffset={insets.top + 44}`. iOS keyboard appears with `UIKeyboardWillShowNotification` — animation matches naturally. |
| Inline category select | Native `<Picker>` wheel (iOS look) sliding up from bottom; HeroUI Native `Select.iOS` variant. 36-item taxonomy — wheel is fine for that size. |
| Constituency select | Three-step drill-down (state → district → constituency) using **`Modal` with full-screen pageSheet**. Back button in nav bar (chevron-left, not arrow). |
| Submit gesture | Tap; no swipe-to-submit. CTA pinned bottom respecting home-bar inset. |

### Android (Material 3)

| Concern | Android behavior |
|---------|------------------|
| Photo picker | **Android Photo Picker** (API 33+) via `expo-image-picker` — same `selectionLimit: 3`. On API 30–32 fallback to Storage Access Framework; on < 30 fallback to legacy gallery intent. `expo-image-picker` handles the version branching internally — we declare `targetSdkVersion: 35` and trust it. |
| Manifest permissions | API 33+ uses **scoped media access** — no `READ_EXTERNAL_STORAGE` declared. Only `READ_MEDIA_IMAGES`. On < 33 (rare on S1 user base but possible): `READ_EXTERNAL_STORAGE` with `maxSdkVersion="32"`. |
| Camera path | `<uses-permission android:name="android.permission.CAMERA"/>` + `<uses-feature android:name="android.hardware.camera" android:required="false"/>` (required=false so Play Store does not exclude tablets w/o cameras). |
| Keyboard avoidance | `android:windowSoftInputMode="adjustResize"` in `AndroidManifest.xml` activity tag. `KeyboardAvoidingView` with `behavior="height"` (NOT padding — different bug profile on Android). |
| Inline category select | Material 3 **ExposedDropdownMenu** (chip-like, expands to scrollable list). HeroUI Native `Select.Android` variant. Avoid native picker wheel — un-Material. |
| Constituency select | Three-step drill-down using **full-screen `Modal` with M3 top-app-bar** (left-aligned title, no back-chevron — uses up-arrow). Material guidance: `TopAppBar.Large` for drill-down hierarchy. |
| Submit gesture | Tap. Material ripple on the FAB (or Extended FAB if "Submit" text-and-icon). |
| Predictive back | Android 14+ predictive back gesture — our composer screen MUST register `BackHandler` to confirm draft-save before dismiss, otherwise user loses draft on a single swipe. |

### Shared / one-codebase

- Draft auto-save logic (TanStack Query mutation, optimistic, debounced 2s).
- Photo limit enforcement (1–3) — pure JS check on `result.assets.length`.
- EXIF strip happens **server-side** (mandatory per ADR-004 + Phase 5.3) — we send raw bytes.
- TUS-resumable upload to Supabase Storage — same client, same chunk size (5MB).
- Form validation via React Hook Form + Zod (`packages/shared`) — zero branching.

---

## Surface 3 — Complaint Detail (read, comment, flag)

### iOS (HIG)

| Concern | iOS behavior |
|---------|--------------|
| Scroll behavior | Header **collapses on scroll** using `Animated.ScrollView` with native driver. Photo carousel snaps to page bounds (`pagingEnabled`). Velocity-based deceleration is `normal` (iOS default). |
| Pull-to-refresh | `RefreshControl` with `tintColor` = brand accent. Spinner is the rotating ring (HIG-default). |
| Tap feedback | `TouchableOpacity` with `activeOpacity={0.7}` — no ripple. HeroUI Native's `Pressable` wrapper handles this per platform. |
| Share sheet | `Share.share({ url, message })` triggers iOS `UIActivityViewController`. We pass a deep-link URL (`https://factivist.app/c/<id>`); iOS auto-detects and shows app-aware actions. |
| Flag action | "Report" appears in a `ActionSheet` (HIG) sliding up; primary destructive action ("Report as abusive") is red. Cancel pinned at bottom. |
| Comment input | Sticky at bottom; `KeyboardAvoidingView` padding behavior. iOS keyboard's QuickType bar usable. |

### Android (Material 3)

| Concern | Android behavior |
|---------|------------------|
| Scroll behavior | Header collapses using **CollapsingTopAppBar** pattern (we approximate with `Animated.ScrollView` + interpolated height; native CTA M3 component isn't in HeroUI Native yet — flagged for ui-templater). Photo carousel snaps but with **Material momentum** (lower friction). |
| Pull-to-refresh | `RefreshControl` — Android renders the M3 SwipeRefresh circular progress indicator at top. Color = brand accent on `progressBackgroundColor` = surface. |
| Tap feedback | Material ripple via `Pressable` with `android_ripple={{ color: ripple, borderless: false }}`. HeroUI Native handles the platform fork. |
| Share sheet | `Share.share` triggers Android's **share sheet** (bottom). Same URL payload. **Direct-share targets** auto-populate based on user history — no app-side wiring needed. |
| Flag action | Material 3 **BottomSheet** (modal) with three options: Report, Block author (post-S1), Cancel. Destructive action labeled red but not the only color cue — also has warning icon. |
| Comment input | Sticky at bottom; `adjustResize` handles keyboard. M3 prefers a circular send icon button, not a text-link "Send". |

### Shared

- Comment list virtualization (`FlashList` from Shopify; same on both — see `react-native-best-practices`).
- Optimistic comment posting via TanStack Query.
- Flag idempotency key (UUID v7 per comment).

---

## Surface 4 — Browse / Filter by state → district → constituency

### iOS (HIG)

| Concern | iOS behavior |
|---------|--------------|
| Category select | Picker wheel modal from bottom — HIG standard for selecting from a fixed list. HeroUI Native `Select.iOS`. |
| Filter modal entry | Tap "Filter" → modal slides up (`pageSheet` presentation). Filter chips at top (Active filters), clear-all in top-right (text button, no icon — HIG). |
| Pull-to-refresh | Standard iOS spinner. |
| List style | `FlashList` with `estimatedItemSize`. Tap row = navigation push (right-chevron disclosure on each row — HIG). |
| Empty state | Centered icon + headline + supporting copy + a single text-style CTA. No raised button. |
| Section headers | Sticky on scroll (iOS UITableView style). |

### Android (Material 3)

| Concern | Android behavior |
|---------|------------------|
| Category select | Material 3 **DropdownMenu** anchored to the trigger chip. For 36-item taxonomy, this is a long list — use the **Modal Bottom Sheet with search** pattern for ≥ 20 items. |
| Filter modal entry | Tap "Filter" → bottom sheet (modal). Filter chips at top; "Clear all" as text button on left. |
| Pull-to-refresh | M3 SwipeRefresh indicator. |
| List style | `FlashList` same. Tap row = M3 ripple, **no chevron** — Material guidance: don't decorate rows with chevrons; the ripple is the affordance. |
| Empty state | Same anatomy, but the CTA can be a `FilledTonalButton` (M3) — slightly less weight than Filled. |
| Section headers | M3 prefers non-sticky section headers in lists; we use sticky **only** if data exceeds 50 items (perf/UX tradeoff documented). |

### Shared

- Filter state in URL params (Expo Router) — both platforms benefit from share-a-filter deep-linking.
- TanStack Query cache key = serialized filter object.

---

## Surface 5 — Postgres FTS Search Results

### iOS (HIG)

| Concern | iOS behavior |
|---------|--------------|
| Search entry | **Large title with embedded search bar** (HIG iOS 13+). The search field collapses into nav bar on scroll. Use Expo Router `headerLargeTitle: true` + `headerSearchBarOptions`. |
| Cancel | "Cancel" text button appears next to search bar when focused — standard iOS pattern. |
| Recent searches | Drop-down list under search field, tap to refill (HIG pattern). |
| Voice search | iOS dictation key on keyboard — no app integration needed. |
| Results list | Highlight matched term via `<Text>` styled spans; iOS uses subtle yellow highlight or bold. |

### Android (Material 3)

| Concern | Android behavior |
|---------|------------------|
| Search entry | Material 3 **SearchBar** component pattern: pill-shaped, full-width, with **leading search icon** and **trailing voice/clear icons**. On focus, expands to **SearchView** full-screen. |
| Cancel | Up-arrow (back) returns to results list; no "Cancel" text. |
| Recent searches | Shown in the expanded SearchView body. Tap to refill — same UX, different chrome. |
| Voice search | Microphone trailing icon — wire to `expo-speech-recognition` (S2). For S1: show but display "Coming soon" toast. |
| Results list | Highlight matched term — same span approach; Material prefers slightly heavier bold than iOS yellow. |

### Shared

- FTS query construction (TanStack Query call to `/discovery/search?q=`).
- Debounce 250ms (one constant, shared).
- Result item card is shared (`Complaint.Card` compound from `packages/ui/native`).

---

## Surface 6 — Citizen Profile (anonymous handle, no PII)

> **Privacy anchor (ADR-010):** This screen displays **nullifier-derived handle
> only**. No national-ID, name, address, photo. If the design team ever
> introduces an avatar field on this screen, that change requires
> `sec-architect` sign-off.

### iOS (HIG)

| Concern | iOS behavior |
|---------|--------------|
| Navigation pattern | Native nav stack (`Stack.Navigator` via Expo Router). Tab-bar **bottom**, persistent across profile screens. |
| Settings entry | `Settings` row appears in profile body (not a nav-bar icon). Tap → push. |
| Sign-out | In Settings only; never a top-level destructive action. HIG: destructive actions are rare and inside Action Sheets. |
| Tab bar position | **Bottom** — HIG strict. Five tabs maximum (we have 4: Browse, Search, Compose, Profile). |

### Android (Material 3)

| Concern | Android behavior |
|---------|------------------|
| Navigation pattern | M3 NavigationBar (bottom). Some Material 3 designs use **NavigationRail** (side) on tablets and **NavigationBar** on phones — we are phone-only for S1, NavigationBar wins. |
| Settings entry | Gear icon (top-right of profile screen) — M3 affordance differs from iOS. Tap → navigate. |
| Sign-out | Settings page; M3 `OutlinedButton` (not destructive-red by default — M3 reserves error red for system-level errors). |
| Tab bar position | **Bottom** for phones (we do not opt into top-tabs even though M3 permits it — keeps parity with iOS for muscle memory). |

### Shared

- Profile data fetch via TanStack Query.
- Anonymous handle generator (`nullifier → handle`) lives in `packages/shared`.
- Complaint count and constituency badge — shared rendering.

---

## Surface 7 — Moderation Queue (admin-only)

> **Visibility:** Admin role only; non-admin users do not see this surface at
> all (no tab, no deep link). RBAC enforced server-side (Phase 5.C) and
> client-side via Expo Router protected route.

### iOS (HIG)

| Concern | iOS behavior |
|---------|--------------|
| Decision gesture | **Swipe actions** via `Swipeable` row (react-native-gesture-handler). Leading swipe = Approve (green), trailing = Reject (red), short-swipe = Snooze 24h (amber). Long-swipe-to-confirm for destructive. |
| Detail expand | Tap row pushes to detail. Image attachments expand modally. |
| Bulk actions | Multi-select via long-press; selected count appears in nav-bar title. Action sheet for batch approve/reject. |
| Confirmations | iOS `Alert.alert` for destructive batch — never silent. |

### Android (Material 3)

| Concern | Android behavior |
|---------|------------------|
| Decision gesture | **Material 3 SwipeToDismiss** pattern with directional thresholds. Leading = Approve, trailing = Reject. Swipe icons revealed underneath (M3 expressive pattern). |
| Detail expand | Tap row navigates; transition uses M3 shared-axis (horizontal) when supported. |
| Bulk actions | Long-press enters Contextual Action Bar (CAB) replacing the top app bar. M3 selection mode. |
| Confirmations | M3 dialog (centered) for destructive batch. |

### Shared

- Decision API call (`POST /admin/moderation/<id>/decide`) idempotent with mutation key.
- Local optimistic remove from queue.
- Audit trail entry server-generated (per Phase 4 ADR — moderation audit is required).

---

## Surface 8 — Static Legal Pages (ToS, privacy, ZKP explainer, grievance officer)

### iOS (HIG)

| Concern | iOS behavior |
|---------|--------------|
| Rendering | **In-app `WebView`** (`expo-webview`) loading bundled HTML from `apps/mobile/assets/legal/<lang>/<doc>.html`. Reason: offline cache + version pinning + no external network for legal text. |
| External links | Inside the WebView, links open in **SFSafariViewController** (`expo-web-browser` `openBrowserAsync` — uses SFSVC under the hood). User stays in app shell; back-button returns. |
| Grievance contact | **Mail.app deep link** via `mailto:grievance@factivist.org` through `Linking.openURL`. If no mail account configured, fallback to clipboard copy + toast. **DO NOT** use a custom in-app mail form — IT Rules 2021 require a direct contact path. |
| Search within doc | iOS gives us Find-on-page in SFSafariView, but **not** in in-app WebView. We add a sticky table-of-contents at top of each doc. |
| Reader mode | SFSafariViewController has reader mode toggle — surface to user when displaying ZKP explainer (long-form). |

### Android (Material 3)

| Concern | Android behavior |
|---------|------------------|
| Rendering | **In-app `WebView`** loading the same bundled HTML. WebView on Android is Chromium-backed (System WebView) — handle missing System WebView edge case with graceful "Please update Chrome System WebView" message. |
| External links | **Chrome Custom Tabs** via `expo-web-browser` `openBrowserAsync`. Falls back to user's default browser if Chrome unavailable. |
| Grievance contact | **Implicit `ACTION_SENDTO` intent** with `mailto:` URI through `Linking.openURL`. Android shows app chooser (Gmail, Outlook, etc.). Fallback to clipboard copy if no mail app installed. |
| Search within doc | WebView doesn't expose find-on-page across both OS — same sticky ToC approach. |
| Reader mode | Chrome Custom Tabs supports reader mode on Chrome 75+ — no app-side toggle needed. |

### Shared

- HTML asset pipeline: legal docs version-pinned in `apps/mobile/assets/legal/` with semver in filename; updated only via PR.
- ZKP explainer copy + diagrams — bundled `.svg` and `.html`.
- Grievance officer name, email, postal address (IT Rules 2021 mandates publication) — pulled at build time from `packages/shared/constants/grievance-officer.ts`.

---

## Surface 9 — App-shell mobile screens with offline-friendly skeletons

> **Mobile-only surface.** No web counterpart. See dedicated section
> "Offline-friendly skeletons" below for the full spec.

### iOS (HIG)

| Concern | iOS behavior |
|---------|--------------|
| Tab bar | `Tabs` (Expo Router) → iOS UITabBar. **Bottom**, 5 tabs max (we use 4 for citizen, 5 for admin). SF Symbols icons via `@expo/vector-icons` SF Symbols mapping (`SymbolView` when on iOS 16+). |
| Status bar | Brand-tinted (Indigo 600 by default). Switches to `dark-content` on white surfaces. |
| Launch screen | Storyboard-based `LaunchScreen.storyboard` configured via `expo.ios.splash` — App Review requires LaunchScreen.storyboard, not a static image, on new submissions. |
| Deep links | Universal Links via `apple-app-site-association` hosted on `factivist.app/.well-known/apple-app-site-association`. Custom URL scheme `factivist://` as fallback. |
| App icon | 1024×1024 PNG (no transparency); 18 size variants generated by Expo. |

### Android (Material 3)

| Concern | Android behavior |
|---------|------------------|
| Tab bar | Expo Router `Tabs` → M3 NavigationBar. Bottom. Material 3 icon set via `MaterialCommunityIcons`. |
| Status bar | M3 supports dynamic theming — we **disable** dynamic color in S1 and force brand color via `expo-status-bar`. |
| Launch screen | Adaptive launch icon + brand color background. Expo `expo.android.splash` config; foreground vector + background color. |
| Deep links | App Links via `assetlinks.json` hosted on `factivist.app/.well-known/assetlinks.json`. Custom scheme `factivist://` as fallback. |
| App icon | Foreground PNG + background color → adaptive icon. Also generate legacy round + square icons (Android 7.x). |

### Shared

- Routing tree — see [`expo-router-routes.md`](./expo-router-routes.md).
- Offline detection (`@react-native-community/netinfo`) — single hook shared.
- Skeleton component (`<Skeleton>` from HeroUI Native) — shared.

---

## Cross-cutting concerns

### Dynamic type / font scale

| Platform | API | Behavior |
|----------|-----|----------|
| iOS | `useFontScale()` reads `UIAccessibility.preferredContentSizeCategory`. | Honor up to `accessibilityLarge3` (largest accessibility size). Layouts MUST reflow — no truncation on body copy. |
| Android | `PixelRatio.getFontScale()` reads system font scale (0.85x – 2.0x). | Honor full range. Test at 2.0x — most layout bugs surface there. |

**Rule:** any text component imported from `packages/ui/native` MUST use `Text`
with `allowFontScaling={true}` (default). Layout-critical text (badge counts,
tab labels) may opt out with `maxFontSizeMultiplier={1.3}` — never below 1.3 or
we fail WCAG.

### Voice-over / TalkBack

| Element | iOS (VoiceOver) | Android (TalkBack) |
|---------|-----------------|---------------------|
| Buttons | `accessibilityRole="button"`, `accessibilityLabel` set, `accessibilityHint` for non-obvious actions. | Same React Native props map directly. |
| Photo thumbnails in composer | `accessibilityLabel="Selected photo {n} of {total}, tap to remove"`. | Same. |
| Proof-progress modal | `accessibilityViewIsModal={true}` (iOS) + `importantForAccessibility="yes-hide-descendants"` on background (Android). Announce progress via `AccessibilityInfo.announceForAccessibility`. |
| Filter chips | `accessibilityRole="checkbox"` + `accessibilityState={{ checked }}`. | Same. |
| Decision swipe (mod queue) | Provide non-gesture alternative: tap row → action sheet with same actions. Required for WCAG 2.5.1 Pointer Gestures. |

**Rule:** every interactive element MUST pass `a11y-audit` skill scan before
merge. Zero serious/critical violations per Phase 3.5 exit gate.

### Reduced-motion

| Platform | API | Behavior |
|----------|-----|----------|
| iOS | `AccessibilityInfo.isReduceMotionEnabled()` + listener. | Disable: header collapse animation, photo carousel auto-snap, proof-progress shimmer. Replace shimmer with static "Working…" + indeterminate progress. |
| Android | Same RN API; reads `Settings.Global.TRANSITION_ANIMATION_SCALE`. | Same disable list. |

### High-contrast

| Platform | API | Behavior |
|----------|-----|----------|
| iOS | `AccessibilityInfo.isInvertColorsEnabled()` + `isDarkerSystemColorsEnabled()`. | Auto-handled by oklch tokens in dark mode; check contrast in `packages/ui/theme` semantic tokens. |
| Android | `Settings.Secure.HIGH_TEXT_CONTRAST_ENABLED` (not officially exposed by RN; use `react-native-accessibility-info` if needed). | Same token strategy. |

**Rule:** every semantic color pair in `packages/ui/theme` MUST hit WCAG AA
(4.5:1 normal text, 3:1 large text). Tested in axe-core during a11y-auditor's
Phase 3 audit.

---

## Offline-friendly skeletons (Surface 9 full spec)

### Detection

- Use `@react-native-community/netinfo` `useNetInfo()` hook at root provider.
- States: `online`, `offline`, `metered` (cellular), `unknown` (initial).
- Treat `unknown` as `online` to avoid pessimistic UI on cold start.

### Cached data displayed when offline

| Surface | Cached source | Stale-while-revalidate? |
|---------|---------------|--------------------------|
| Browse | TanStack Query persisted cache (last 50 complaints per active filter). Persisted via `@tanstack/query-async-storage-persister` to MMKV. | Yes — stale data shown with a small "Offline · last synced X ago" banner above the list. |
| Detail | Last 20 viewed complaints' full bodies cached (LRU). | Yes. |
| Search | Last 5 search queries' top-10 results. | Show banner: "Searching offline — results may be outdated." Disable new searches until online. |
| Profile | Current user's own profile fully cached. | Yes. |
| Composer | Draft persisted on each keystroke (debounced 500ms) to MMKV. Photos kept as local URIs. | N/A — composing offline is fully supported. Sync on reconnect. |
| Mod queue | NOT cached — admin-only, requires fresh data for moderation correctness. | Display "Moderation queue requires connection" empty state. |
| Legal | Bundled HTML — works fully offline always. | N/A. |

### Banner pattern (HeroUI Native compound)

When offline:

```
[ ⚠️  Offline mode · drafts saved locally · syncing on reconnect       ]
```

- Position: under the tab bar header, above content scroll.
- Compound: `App.OfflineBanner` (lives in `packages/ui/native`).
- Color: `semantic.warning.surface` — not error red, not silent.
- Dismissible? **No.** Stays until network returns.

### Sync trigger on reconnect

1. `netInfo.isConnected === true` after being `false`.
2. Sync queue (Zustand store `useSyncQueue`) processes in order:
   - **Composed-while-offline drafts** with photos → upload via TUS resumable
     (chunks survive interruption).
   - **Pending flags / reports** → POST in batches of 5.
   - **Read-receipts** for moderation queue (admin) → POST.
3. Each item has retry policy: exponential back-off, max 5 attempts.
4. On success: optimistic local item replaced with server item (same id).
5. On final failure: surface "Could not sync — tap to retry" CTA on the item.

### Conflict resolution (offline-composed complaint)

**Scenario:** user drafts complaint A offline. Reconnects. Server says someone
already deleted the constituency they selected (admin removed it — extremely
rare in S1, but constituency dataset can be re-seeded).

- Resolution: server returns `409 Conflict` with `error: 'constituency_invalid'`.
- Client: show modal "The constituency you selected is no longer available.
  Please choose another." with link back to composer pre-filled with everything
  except constituency.
- Draft is NOT deleted until user explicitly discards.

**Scenario:** nullifier already used (user re-verified on another device in
the meantime — anoncitizen permits one nullifier per citizen per app).

- Resolution: server returns `409 Conflict` with `error: 'nullifier_in_use'`.
- Client: show full-screen explainer: "Looks like you verified on another
  device. Sign out here to merge." → onboarding flow restart.

---

## Camera & photo permissions (full spec)

### iOS (`Info.plist` — via `app.config.ts`)

```ts
// apps/mobile/app.config.ts (ui-templater owns implementation in Phase 5)
ios: {
  infoPlist: {
    NSPhotoLibraryUsageDescription:
      "Factivist needs access only when you choose photos for a complaint. We never browse your library.",
    NSCameraUsageDescription:
      "Factivist uses your camera only when you tap 'Take photo' inside a complaint.",
    NSFaceIDUsageDescription:
      "Factivist locks your app with Face ID so even if someone unlocks your phone, your draft complaints stay private."
  }
}
```

- **Trigger timing:** request permission only at the moment of first use, not
  on app launch. (App Review will reject if requested upfront with no
  contextual link.)
- **One-time vs always:** iOS 14+ offers "Allow Once" + "Allow Selected Photos"
  + "Allow Access to All Photos". PHPicker bypasses this prompt entirely — use
  PHPicker for the composer. Camera prompt asks once; if denied, show
  fallback.
- **Denial fallback:** display in-app banner "Photo library access blocked.
  Tap to open Settings." → `Linking.openSettings()`. Never block the composer
  outright — user can still type text-only complaint.

### Android (manifest — via `app.config.ts`)

```ts
android: {
  permissions: [
    "android.permission.CAMERA",
    "android.permission.READ_MEDIA_IMAGES",  // API 33+
    "android.permission.USE_BIOMETRIC"
  ]
}
```

- **Runtime request UI:** `expo-image-picker` and `expo-camera` handle
  runtime request via standard Android dialog. We show a **pre-prompt**
  in-app explainer screen 1× per session before triggering the system dialog,
  per Play Store best practice (improves grant rate ~20%).
- **One-time vs always:** Android 14+ offers "Only this time" — accept and
  proceed. Permission is per-session.
- **Denial fallback:** same as iOS — banner with "Open Settings" deep link.

---

## App Store / Play Store compliance

### iOS — Privacy nutrition labels for S1

**Data Linked to You:** **None** — anoncitizen guarantees this. No
national-ID, name, email, address, phone, photo of citizen.

**Data Not Linked to You:**

| Category | Specific data | Purpose | Linked? |
|----------|---------------|---------|---------|
| User Content | Photos (complaint attachments) | App Functionality | Not linked |
| User Content | Other user content (complaint text, comments) | App Functionality | Not linked |
| Identifiers | Device ID (anonymous nullifier hash) | App Functionality | Not linked |
| Diagnostics | Crash data, performance data | Analytics | Not linked |
| Location | Approximate (constituency = coarse geo) | App Functionality | Not linked |

**Data Used to Track You:** **None.**

**Submitted via App Store Connect → Privacy section.** Sign-off required from
sec-architect and general-counsel-advisor before TestFlight submit.

### Android — Google Play Data Safety form

Maps roughly to iOS labels. Key claims:

| Section | Answer |
|---------|--------|
| Data collected | Photos, complaint text, approximate location (constituency), device performance |
| Data shared with third parties | **No** (Supabase is our processor, not a third party under Play definition) |
| Data encrypted in transit | Yes (TLS 1.3) |
| Users can request data deletion | Yes — via `/account/delete` endpoint; nullifier preserved (one-way hash) but all content tombstoned |
| Data is collected | Required (photos, text) + Optional (constituency) |
| Account creation requires personal info | **No** — anonymous handle only |

**Sign-off:** sec-architect + general-counsel-advisor before Play internal track.

### Both stores — content policy notes

- **User-generated content moderation** — must declare manual queue + flag
  flow + grievance officer contact. Phase 5.C delivers; this surface (legal)
  publishes the policy.
- **IT Rules 2021 (India)** — grievance officer name + email + postal address
  must be in-app on Surface 8.
- **No targeted ads in S1** — declare "No ads" in both stores; reduces review
  friction.

---

## Cross-cutting platform risks (top 3)

1. **App Store rejection on Info.plist permission strings.** Strings must
   describe *when* and *why* — not just *what*. Phase 5 must lint these as
   build-time check.
2. **Play Store flag for over-broad permissions.** Declaring
   `READ_EXTERNAL_STORAGE` without `maxSdkVersion="32"` on API 33+ triggers a
   policy violation. The `expo-image-picker` plugin must be pinned to a version
   that handles this correctly (≥ 14.x).
3. **Accessibility audit failure on swipe gestures (mod queue).** Pointer
   gesture requirement (WCAG 2.5.1) demands non-gesture alternative; if the
   tap-to-open-action-sheet alternative isn't wired for admin users, a11y-auditor
   blocks merge. Mod queue is admin-only but still in scope for the audit.

---

## Cross-references

- ux-lead per-surface specs: [`docs/design/s1/surfaces/`](./surfaces/)
- Expo Router routes: [`expo-router-routes.md`](./expo-router-routes.md)
- ZKP hybrid proving UX: [`mobile-zkp-proving-ux.md`](./mobile-zkp-proving-ux.md)
- HeroUI compound naming (ui-templater): [`packages/ui/native/CLAUDE.md`](../../../packages/ui/native/CLAUDE.md)
- A11y audit gate: Phase 3.5 exit gate
- ADR-008 (single mobile codebase): `docs/adr/0008-*.md` (Phase 4)
- ADR-010 (citizen anonymity floor): `docs/adr/0010-*.md` (Phase 4)
- ADR-011 (hybrid proving): `docs/adr/0011-*.md` (Phase 4)
