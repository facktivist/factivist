import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { VerifyButton } from './VerifyButton.tsx'

/**
 * Identity onboarding screen for the Expo app.
 *
 * Hero copy is rendered here as the server-equivalent (RN has no SSR,
 * but keeping the framing static + the proof submission inside
 * VerifyButton mirrors the web layout). VerifyButton consumes
 * Onboarding.VerifyStep from `@factivist/ui-native` so loading + error
 * + success states ship the design-system framing.
 *
 * Per the apps/mobile rule, every screen wraps SafeAreaView + ScrollView.
 */
export function IdentityScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="identity-screen">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 24 }}
        testID="identity-scroll"
      >
        <View accessibilityRole="header" className="flex flex-col gap-2">
          <Text className="text-2xl font-semibold text-foreground">Verify your citizenship</Text>
          <Text className="text-sm text-muted-foreground">
            You will run a zero-knowledge proof on this device. Factivist never sees your name,
            Aadhaar number, address, or photo — only an opaque nullifier proving you are a unique
            Indian citizen.
          </Text>
        </View>
        <VerifyButton />
      </ScrollView>
    </SafeAreaView>
  )
}
