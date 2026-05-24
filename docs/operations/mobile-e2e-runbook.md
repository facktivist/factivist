# Mobile E2E Runbook (Detox, iOS + Android)

> **Owner.** `detox-eng` (Phase 6 wave A).
> **Pairs with.** `tester` lead, `qa-lead` (gate), `argent-environment-inspector` subagent.
> **Source of truth.** [`docs/action-plans/season-1/s1-action-plan.md`](../action-plans/season-1/s1-action-plan.md) §6.4-6.5.
> **Last reviewed.** 2026-05-24.

---

## 0. Specs in scope

Five Phase 6 §6.4 specs under `apps/mobile/e2e/`:

| Spec                  | Flow                                                          |
| --------------------- | ------------------------------------------------------------- |
| `onboarding.spec.ts`  | Profile tab → IdentityScreen + verify CTA (no real ZKP yet)   |
| `submit.spec.ts`      | Compose → title + category + 4-level constituency + body → publish |
| `browse.spec.ts`      | Home tab → DiscoveryScreen renders seeded complaint row       |
| `tabs.spec.ts`        | ADR-0019 tab order parity + no-FAB invariant                  |
| `permissions.spec.ts` | Camera permission dialog text matches `app.json` lock         |

Legacy `home.spec.ts` (Phase 5 wave 1 smoke) stays as a documented Detox-matcher reference. The Phase 6 specs use the `e2e/support/argent.ts` helper which enforces `discover() → tapDiscovered()` ordering — the Detox equivalent of the Argent MCP `describe → gesture-tap` discipline.

## 1. One-time setup

```bash
# iOS — Detox needs applesimutils for sim management.
brew tap wix/brew
brew install applesimutils

# Android — Detox needs adb + an emulator AVD named exactly `Pixel_7_API_34`
# (set in apps/mobile/.detoxrc.js). Create via Android Studio or:
$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd \
  -n Pixel_7_API_34 -k 'system-images;android-34;google_apis;arm64-v8a'
```

## 2. Prebuild + native build

Detox tests the release-mode native binary; Expo Go is unsupported.

```bash
cd apps/mobile

# Generate native iOS + Android projects from app.json.
bunx expo prebuild --clean

# iOS — Debug-iphonesimulator binary.
bun run e2e:build:ios

# Android — Debug APK.
bun run e2e:build:android
```

Build outputs land where `.detoxrc.js` expects them:

- iOS: `ios/build/Build/Products/Debug-iphonesimulator/Factivist.app`
- Android: `android/app/build/outputs/apk/debug/app-debug.apk`

## 3. Run

```bash
# iOS — iPhone 15 simulator from .detoxrc.js.
bun run test:e2e:ios

# Android — Pixel_7_API_34 emulator.
bun run test:e2e:android
```

The simulator / emulator **must already be booted** before `detox test`. Confirm with the Argent MCP `list-devices` tool (project rule `argent.md` — prefer running devices). Detox will pick the booted device automatically.

## 4. Argent MCP requirement (per `argent.md`)

Every spec author MUST walk the flow once under Argent MCP before encoding it as a Detox spec:

1. `argent list-devices` → confirm sim/emulator state.
2. `argent describe` after each navigation → capture the testID tree.
3. Never derive coordinates from a screenshot — re-run `describe` when the layout changes.
4. Encode the discovered testIDs into the spec using the `discover()` helper in `e2e/support/argent.ts`. The helper fails fast if the element is not in the hierarchy, mirroring the Argent invariant.

See skills: `argent-test-ui-flow`, `argent-device-interact`, `argent-react-native-app-workflow`, `detox-skill`.

## 5. Known limitations (S1)

- **Real ZKP proving is OFF** in the e2e API stack — the prover server returns 503 with code `ZKP_PROVER_NOT_CONFIGURED` until rapidsnark is wired (Phase 9). `onboarding.spec.ts` therefore asserts only the verify CTA surface.
- **Photo capture is mocked** via `expo-image-picker` test stubs — Detox can not drive the OS camera UI on a simulator.
- **No real Aadhaar / PII** in any fixture. The fake nullifier convention is `999999999999` (mirrors `apps/api/src/lib/__tests__/zkp-prover.test.ts`).
- **Hermetic local API only.** Never point the simulator at staging / prod — the e2e seed includes fixture IDs that would collide.
- **Permissions specs are platform-asymmetric.** The library-permission and deny-path assertions are skipped pending a standardised Android emulator skin (Phase 7).

## 6. Deferred work

| Item                                | Lands in | Why                                              |
| ----------------------------------- | -------- | ------------------------------------------------ |
| CI device matrix (iOS + Android)    | Phase 7  | GitHub Actions workflows §7                      |
| Real ZKP proving on device          | Phase 9  | rapidsnark integration + vKey provisioning        |
| On-device performance baseline      | Phase 9  | `argent-react-native-profiler`, ties §6.5         |
| Library-permission + deny paths     | Phase 7  | Needs single Android AVD skin standardised in CI |
| 503 / paused-submissions flow       | Phase 7  | Needs runtime API toggle in the test stack       |
