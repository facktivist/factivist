import { IdentityScreen } from '../../src/features/identity/IdentityScreen.tsx'

/**
 * Tab 4 — Profile.
 *
 * Phase 5 wave 1 renders the identity / verification surface here. The
 * verified-citizen profile view (Surface 6) lands in a later wave; until
 * then we surface the proof-handoff CTA so users can verify from the
 * profile tab.
 */
export default function ProfileTab() {
  return <IdentityScreen />
}
