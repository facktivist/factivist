import * as Sentry from '@sentry/react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { HeroUINativeProvider } from 'heroui-native'
import { LogBox } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Providers } from '../src/lib/providers.tsx'
import { initSentry } from '../src/lib/sentry.ts'
import '../global.css'

// LogBox toasts overlay the bottom tab bar and push tab items below
// Detox's 75% visibility threshold, making tabs untappable during E2E.
// Suppress the LogBox overlay entirely — warnings still surface via the
// Metro console and Sentry breadcrumbs, so debugging is not affected.
// `ignoreAllLogs` is a no-op in production builds (__DEV__ === false).
LogBox.ignoreAllLogs(true)

initSentry()

/**
 * Root layout for the Expo Router stack.
 *
 * Wraps the navigation tree in the providers HeroUI Native requires:
 *   - GestureHandlerRootView → gesture-handler + Reanimated worklets
 *   - SafeAreaProvider       → notch / dynamic-island padding via useSafeAreaInsets
 *   - HeroUINativeProvider   → theme + portal host for Dialog/BottomSheet
 *
 * Screens are declared in `app/` and registered automatically by file path.
 */
export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <Providers>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="compose" options={{ headerShown: false }} />
              <Stack.Screen name="complaint" />
            </Stack>
          </Providers>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
})
