import { Card } from '@factivist/ui-native/components'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * `/complaint/[id]` — Surface 3 (Complaint detail) placeholder.
 *
 * The real detail surface (body, photos, comments, flag action sheet)
 * lands in a follow-up Phase 5 wave. This stub renders the navigated-to
 * id so the composer's post-submit `router.push` resolves cleanly
 * without crashing.
 */
export default function ComplaintDetail() {
  const params = useLocalSearchParams<{ id: string }>()
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="complaint-detail">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <Card>
          <Card.Header>
            <Card.Title>Complaint published</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>
              Detail page lands in a follow-up wave. For now we can confirm the new complaint id:
            </Card.Description>
            <Text className="mt-2 text-sm font-mono" testID="complaint-id">
              {params.id ?? '(unknown)'}
            </Text>
          </Card.Body>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
