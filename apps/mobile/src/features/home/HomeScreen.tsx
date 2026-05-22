import { Card } from '@factivist/ui-native/components'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CtaButton } from './components/CtaButton.tsx'

/**
 * Home screen for the Factivist mobile app.
 *
 * Follows the apps/mobile rule: SafeAreaView + ScrollView wrap every screen.
 * Composition mirrors `apps/web` so brand voice and structure stay aligned.
 *
 * HeroUI Native compound components are used via dot notation (`Card.Header`,
 * `Card.Body`, etc.) and only semantic variants are exposed downstream.
 */
export function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="home-screen">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 24 }}
        testID="home-scroll"
      >
        <Card>
          <Card.Header>
            <Card.Title>Welcome to Factivist</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>
              Mobile scaffold for fact-driven publishing — Expo 56, HeroUI Native, Uniwind.
            </Card.Description>
          </Card.Body>
          <Card.Footer>
            <CtaButton />
          </Card.Footer>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
