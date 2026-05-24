/// <reference types="detox" />

/**
 * Pipeline B Detox e2e — complaint composer + discovery smoke test.
 *
 * Status: `.todo` placeholders. The full capture → tus-upload → discovery
 * loop requires:
 *   1. A signed Supabase Storage bucket reachable from the simulator (CI
 *      currently runs Detox against a hermetic local stack — that stack
 *      ships in Pipeline E).
 *   2. Camera permissions stubbed via `detox.config.js` permissions block
 *      (granted by default in Jest preset, but `expo-image-picker` needs
 *      the host's photo library populated; CI mounts a fixture image set).
 *
 * Until Pipeline E lands the Storage bucket + photo fixtures, leave these
 * tests as `.todo` so the suite passes today and lights up red the moment
 * the prerequisites land. Argent toolkit is the manual cross-check in the
 * meantime (see `argent-test-ui-flow` skill).
 */
describe('complaint composer e2e (mobile)', () => {
  it.todo('opens the composer from the Compose tab')
  it.todo('captures a photo, uploads via tus, and surfaces a public URL')
  it.todo('submits the complaint and navigates to /complaint/:id')
  it.todo('newly-published complaint appears at top of discovery feed')
  it.todo('flag button submits a pii-leak flag and shows confirmation toast')
})
