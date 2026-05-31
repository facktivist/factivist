import { Stack } from 'expo-router'

/**
 * `/complaint/*` stack — Surface 3 (Complaint detail).
 *
 * The detail screen, comments, and report sheet land in a follow-up wave.
 * The stack exists now so that `ComplaintComposer` can `router.push` to
 * `/complaint/[id]` on submit without breaking the navigation tree.
 */
export default function ComplaintLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
