import { Stack } from 'expo-router'
import { Platform } from 'react-native'

/**
 * Compose modal stack — Surface 2.
 *
 * Per `docs/design/s1/expo-router-routes.md`:
 *   - iOS uses the system page-sheet modal (`presentation: 'modal'`,
 *     swipe-down dismiss enabled — draft auto-saves on dismiss in a
 *     later wave).
 *   - Android uses `fullScreenModal` to match Material navigation.
 */
export default function ComposeLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: Platform.OS === 'ios' ? 'modal' : 'fullScreenModal',
        headerTitle: 'Compose',
        headerBackTitle: 'Cancel',
      }}
    />
  )
}
