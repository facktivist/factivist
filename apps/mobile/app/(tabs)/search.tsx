import { Card } from '@factivist/ui-native/components'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * Tab 2 — Search (placeholder).
 *
 * Real FTS search screen lands in a later Phase 5 wave (Surface 5). This
 * stub holds the tab slot so tab-order parity (ADR-0019) is verifiable
 * now.
 */
export default function SearchTab() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="search-tab">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <Card>
          <Card.Header>
            <Card.Title>Search</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>
              Full-text search of complaints arrives in a follow-up wave.
            </Card.Description>
          </Card.Body>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
