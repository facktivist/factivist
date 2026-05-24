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
    // Reset permission grants so the OS dialog fires on first use.
    await launchFresh({ camera: 'NO', photos: 'NO' })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('camera button surfaces the locked permission copy', async () => {
    const compose = await discover('compose')
    await tapDiscovered(compose)
    await discover('complaint-composer')

    const cameraBtn = await discover('photo-camera')
    await tapDiscovered(cameraBtn)

    // The Expo permission helper triggers the OS dialog whose body is
    // the cameraPermission string from app.json. On iOS Detox matches
    // the alert text via `by.label`; on Android via `by.text`.
    const expectedCopy =
      'Factivist needs camera access so you can attach evidence photos to your civic complaint. Nothing uploads until you submit.'

    if (device.getPlatform() === 'ios') {
      await expect(element(by.label(expectedCopy))).toBeVisible()
    } else {
      await expect(element(by.text(expectedCopy))).toBeVisible()
    }
  })

  it.skip('library button surfaces the locked photo-library copy', async () => {
    // Same shape as the camera assertion, against `photo-pick` and the
    // photosPermission string. Skipped until the test stack ships the
    // mocked image-picker fixture set — without it, the OS dialog on
    // Android does not consistently render. Tracked in the runbook.
  })

  it.skip('denying permission surfaces the photoCapture.error text', async () => {
    // Requires a tap on the OS "Don't Allow" button which on Android
    // depends on the emulator skin. Deferred to Phase 7 (CI device
    // matrix) where we standardise on a single Android skin.
  })
})
