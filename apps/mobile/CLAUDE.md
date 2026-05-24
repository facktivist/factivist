# apps/mobile — Expo + HeroUI Native

## Commands
- Dev: `bunx expo start` | Test: `bun run test`
- E2E iOS: `bun run test:e2e:ios` | E2E Android: `bun run test:e2e:android`

## Rules
- Expo Router for typed file-based navigation.
- HeroUI Native + Uniwind for styling. oklch tokens from @factivist/ui-theme.
- SafeAreaView + ScrollView wrapper on every screen.
- @gorhom/bottom-sheet for contextual actions, not full-screen navigations.
- Metro bundler (Expo default, required).
- Detox for E2E in `e2e/`. Vitest + Testing Library RN in `__tests__/`.

## Permissions (S1)
Configured in `app.json` plugins block. Locked by `src/__tests__/app-config.test.ts`.

- **expo-camera** — `cameraPermission`: "Factivist needs camera access so you can attach evidence photos to your civic complaint. Nothing uploads until you submit."
  - iOS: injects `NSCameraUsageDescription` into Info.plist
  - Android: auto-injects `android.permission.CAMERA`
- **expo-image-picker** — `photosPermission`: "Factivist needs photo library access so you can attach evidence photos from your gallery."
  - iOS: injects `NSPhotoLibraryUsageDescription` into Info.plist
  - Android: auto-injects `READ_MEDIA_IMAGES` (API 33+) / `READ_EXTERNAL_STORAGE` (API ≤32)

No manual `android.permissions` override — Expo's plugin auto-injection is the source of truth. To verify after a config change: `bunx expo prebuild --clean` then inspect `ios/Factivist/Info.plist` + `android/app/src/main/AndroidManifest.xml`.

## Skills
@skills/heroui-native
@skills/uniwind
@skills/react-native-best-practices
@skills/building-native-ui
@skills/expo-tailwind-setup
@skills/expo-deployment
@skills/expo-dev-client
@skills/expo-cicd-workflows
@skills/expo-api-routes
@skills/expo-module
@skills/expo-brownfield
@skills/expo-ui-swiftui
@skills/expo-ui-jetpack-compose
@skills/eas-update-insights
@skills/upgrading-expo
@skills/expo-horizon
@skills/migrate-nativewind-to-uniwind
@skills/native-data-fetching
@skills/use-dom
@skills/apple-hig-expert
@skills/rnrepo
@skills/detox-skill
@skills/vitest
@skills/app-store-optimization
@skills/argent-android-emulator-setup
@skills/argent-create-flow
@skills/argent-device-interact
@skills/argent-ios-simulator-setup
@skills/argent-metro-debugger
@skills/argent-native-profiler
@skills/argent-react-native-app-workflow
@skills/argent-react-native-optimization
@skills/argent-react-native-profiler
@skills/argent-test-ui-flow