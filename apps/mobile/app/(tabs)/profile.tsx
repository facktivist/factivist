import { Profile } from '@factivist/ui-native/profile'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { IdentityScreen } from '../../src/features/identity/IdentityScreen.tsx'
import { ApiError, apiClient } from '../../src/lib/api/client.ts'

/**
 * Tab 4 — Profile.
 *
 * Renders the verified-citizen profile when a session exists (S06
 * compound: Profile.Handle + Profile.Stats + Profile.ComplaintList);
 * falls back to the IdentityScreen onboarding flow when the API
 * returns 401 (no session cookie yet).
 *
 * The fallback path preserves the Phase 5 wave 1 behaviour — an
 * unverified visitor lands on the verify-your-citizenship surface
 * directly from the tab.
 */
export default function ProfileTab() {
  const profileQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.getMyProfile(),
    // Never retry on 401 — that's the legitimate "no session yet" signal
    // that drives the IdentityScreen fallback. For other transport
    // errors (offline, DNS, port closed in e2e) cap at one retry so the
    // query settles into the `!profile` branch quickly instead of
    // pinning the screen on a loading spinner indefinitely.
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return false
      return failureCount < 1
    },
  })

  // Unauthenticated → show the onboarding flow inline.
  if (profileQuery.error instanceof ApiError && profileQuery.error.status === 401) {
    return <IdentityScreen />
  }

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="profile-tab">
        <View accessibilityLabel="Loading profile" className="items-center justify-center p-12">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    )
  }

  const profile = profileQuery.data
  if (!profile) {
    // Defensive — query resolved but no data (shouldn't happen with
    // the API contract). Fall back to onboarding so the user has a
    // path forward.
    return <IdentityScreen />
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} testID="profile-tab">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 16 }}>
        <Profile.Handle
          handle={profile.handle}
          nullifierExcerpt={profile.nullifierExcerpt}
          testID="profile-handle"
        />
        <Profile.Stats stats={profile.stats} testID="profile-stats" />
        <Profile.ComplaintList
          handle={profile.handle}
          items={[]}
          loading={false}
          onItemOpen={() => {
            // Mobile complaint list under the profile lands in a
            // follow-up wave (needs an authored-by filter on the
            // /complaints endpoint). The empty hint copy uses the
            // handle for context.
          }}
          testID="profile-complaint-list"
        />
      </ScrollView>
    </SafeAreaView>
  )
}
