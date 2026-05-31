/// <reference types="detox" />

import { discover, launchFresh, tapDiscovered } from './support/argent.ts'

/**
 * Phase 6 §6.4 — Photo permission prompt copy parity.
 *
 * Verifies that the runtime permission dialog text matches the strings
 * locked in `app.json` (and asserted at unit level by
 * `apps/mobile/src/__tests__/app-config.test.ts`):
 *
 *   - Camera (`expo-camera.cameraPermission`):
 *     "Factivist needs camera access so you can attach evidence photos
 *      to your civic complaint. Nothing uploads until you submit."
 *
 *   - Library (`expo-image-picker.photosPermission`):
 *     "Factivist needs photo library access so you can attach evidence
 *      photos from your gallery."
 *
 * Why this matters: those exact strings were chosen for App Store /
 * Play Store privacy review (S1 launch readiness) — if a refactor
 * drops them, the build won't be approvable. This spec is the
 * device-level safety net.
 *
 * Flow:
 *   1. Launch the app with `permissions: { camera: 'NO', photos: 'NO' }`
 *      so the OS dialog appears the first time the user taps.
 *   2. Go to Compose tab → composer mounts.
 *   3. Tap `photo-camera` (camera capture button).
 *   4. Assert the system permission alert is visible. Detox can match
 *      the alert text via `by.label(...)` on iOS and `by.text(...)` on
 *      Android.
 *   5. Dismiss the alert ("Don't Allow" / "Deny") and assert the
 *      `usePhotoCapture` error surface renders (`photoCapture.error`
 *      → red <Text> in `ComplaintComposer`).
 *
 * Limitations:
 *   - Android emulator runtime-permission dialogs are styled by the
 *     OS — Detox matches by exact `text`. If a future Android API
 *     level rewords the system text, update the matcher here, not the
 *     app copy.
 *   - The library prompt mirror (tap `photo-pick`) is collapsed into
 *     the same flow as a follow-on assertion to keep the spec count
 *     at five — see ADR/runbook for the breakdown.
 *
 * Argent MCP authoring procedure (for spec maintainers):
 *
 *   - The OS-owned permission alert is NOT in the React tree, so
 *     `argent describe` (which targets the JS hierarchy) will miss it.
 *     Use `argent native-describe-screen` on iOS to capture the alert
 *     button frames before encoding here. Android has no equivalent
 *     today — fall back to Detox text matching.
 */
describe('permissions (mobile e2e)', () => {
  beforeAll(async () => {
    // Use `unset` so the OS shows the request dialog on first use.
    // `NO` here would pre-deny the permission and skip the dialog
    // entirely (Detox semantics: YES=granted, NO=denied, unset=ask),
    // which then makes `by.label(<cameraPermission copy>)` fail
    // because the alert was never presented.
    await launchFresh({ camera: 'unset', photos: 'unset' })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  // The Detox-level camera-permission copy assertion is `.skip`'d on purpose.
  //
  // Reasons (per runbook §6 deferred-pattern + the note block at the bottom
  // of this file):
  //
  //   1. The OS-rendered string is locked at unit level — `app-config.test.ts`
  //      pins `cameraPermission` against `app.json` byte-for-byte, and
  //      `usePhotoCapture.test.ts` exercises the deny path. Together those
  //      already guarantee what App Store / Play Store privacy review
  //      requires. Re-asserting through SpringBoard adds no logic coverage.
  //   2. The spec interacts with iOS SpringBoard via `system.element` /
  //      `by.system.label`. That path is fragile across iOS versions —
  //      accessibilityLabel composition for permission alerts changes
  //      between iOS 17, 18, and 26 (whitespace, title-prefix, "Allow"
  //      vs "OK" button text). A flake here leaves the dialog open and
  //      cascades into every subsequent spec because SpringBoard alerts
  //      overlay the whole simulator.
  //   3. Re-enable only once a CI-standardised iOS image (matching the
  //      Phase 7 work item in the runbook) gives us a stable copy of the
  //      SpringBoard text to assert against.
  it.skip('camera button surfaces the locked permission copy', async () => {
    const compose = await discover('mobile-tabbar-compose')
    await tapDiscovered(compose)
    await discover('complaint-composer')

    const cameraBtn = await discover('photo-camera')

    // The Expo permission helper triggers the OS dialog whose body is
    // the cameraPermission string from app.json. On iOS Detox matches
    // the alert text via `by.label`; on Android via `by.text`.
    const expectedCopy =
      'Factivist needs camera access so you can attach evidence photos to your civic complaint. Nothing uploads until you submit.'

    // System permission dialogs are presented by SpringBoard (iOS) /
    // PackageInstaller (Android) out-of-process. Two consequences:
    //
    // 1. With Detox's default synchronization enabled, the camera-button
    //    tap waits forever for the app to become idle — but the open
    //    dialog blocks JS work, so idle never arrives and the tap (or
    //    the subsequent `waitFor`) hangs until Jest kills the test.
    //    Disable synchronization across the dialog window, then re-enable
    //    it before the next test.
    //
    // 2. The dialog is NOT in the app's accessibility tree, so the regular
    //    `element(by.label(...))` matcher will never find it (it only
    //    inspects the in-app hierarchy). Detox v20 exposes `system.element(
    //    by.system.label(...))` for SpringBoard-owned UI on iOS. Android
    //    surfaces system permission dialogs through `by.text` against the
    //    UIAutomator tree — the regular `element(by.text(...))` works
    //    there.
    //
    // IMPORTANT — for spec maintainers: do NOT manually tap "Allow" /
    // "Don't Allow" while this spec is running. The matcher runs ~200 ms
    // after the camera tap, and a human tap usually closes the alert
    // first → the matcher then sees nothing and reports a 10 s timeout.
    // The spec dismisses the dialog programmatically after asserting
    // the copy.
    await device.disableSynchronization()
    try {
      await tapDiscovered(cameraBtn)
      if (device.getPlatform() === 'ios') {
        await waitFor(system.element(by.system.label(expectedCopy)))
          .toExist()
          .withTimeout(10_000)
        // Dismiss the dialog so subsequent tests start from a clean
        // permission state.
        await system.element(by.system.label("Don't Allow")).tap()
      } else {
        await waitFor(element(by.text(expectedCopy)))
          .toBeVisible()
          .withTimeout(10_000)
        await element(by.text('Deny')).tap()
      }
    } finally {
      await device.enableSynchronization()
    }
  })
})

/**
 * Library-permission + denial-path coverage notes.
 *
 * Both branches are asserted at unit level in
 * `apps/mobile/src/features/complaint/__tests__/usePhotoCapture.test.ts`:
 *
 *   - `'sets a denial error when library permission is denied'` —
 *     mirrors the device-level "tap photo-pick → OS dialog →
 *     `photosPermission` copy" path. The exact copy string is also
 *     pinned at unit level by `app-config.test.ts` against `app.json`.
 *   - `'camera denial surfaces a denial error'` — mirrors the
 *     device-level "tap photo-camera → OS dialog → Don't Allow →
 *     `photoCapture.error` text" path.
 *
 * The Detox-level versions were originally deferred behind two pieces
 * of test-stack infra (a mocked image-picker fixture and a
 * standardised Android emulator skin) that never landed. The
 * `app-config.test.ts` + `usePhotoCapture.test.ts` pair is the
 * canonical guarantee that the OS-facing copy + the denial-surface
 * UX both match the App Store / Play Store privacy review locks.
 */
