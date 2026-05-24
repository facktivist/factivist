import { Card } from '@factivist/ui-native/components'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { VerifyButton } from './VerifyButton.tsx'

/**
 * Identity onboarding screen for the Expo app.
 *
 * Wraps the HeroUI Native compound surfaces — full `Onboarding.*` compound
 * wiring (Aadhaar capture → proof progress → success) lands in a later
 * Phase 5 wave. This stub renders the framing + a submit affordance that
 * calls the same `/identity/verify` route as web.
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
        <Card>
          <Card.Header>
            <Card.Title>Verify your citizenship</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>
              You will run a zero-knowledge proof on this device. Factivist never sees your name,
              Aadhaar number, address, or photo — only an opaque nullifier proving you are a unique
              Indian citizen.
            </Card.Description>
          </Card.Body>
          <Card.Footer>
            <VerifyButton />
          </Card.Footer>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
