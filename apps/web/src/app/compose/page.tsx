import { ComposerShell } from '../../features/complaint/ComposerShell.tsx'
import { createComplaintAction } from '../../features/complaint/createComplaintAction.ts'

/**
 * `/compose` — Compose tab target.
 *
 * Per ADR-0019, web tab order mirrors mobile (`Home → Search → Compose
 * → Profile`). Compose is an inline link in the tab bar (NEVER a FAB),
 * and the route renders the same `<CreateComplaintForm />` mobile users
 * see, wrapped by `<ComposerShell />` which swaps in the "submissions
 * paused" notice when the `S1_COMPLAINT_SUBMIT` flag is OFF (the API
 * returns 503; the server action translates that into a typed error
 * the shell renders inline).
 *
 * Server Component — the action import crosses the client boundary
 * as a Server Action reference, so the form keeps the same
 * cookie-forwarding semantics as the mobile API client.
 */
export default function ComposePage() {
  return <ComposerShell action={createComplaintAction} />
}
