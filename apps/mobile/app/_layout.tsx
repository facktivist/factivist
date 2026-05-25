import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { HeroUINativeProvider } from 'heroui-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Providers } from '../src/lib/providers.tsx'
import { initSentry } from '../src/lib/sentry.ts'
import '../global.css'

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
export default function RootLayout() {
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
}
