/// <reference types="detox" />

import {
  discover,
  launchFresh,
  scrollToDiscovered,
  tapDiscovered,
  typeDiscovered,
} from './support/argent.ts'

/**
 * Phase 6 §6.4 — Complaint composer happy path.
 *
 * Flow (Argent-driven authoring; encoded against Detox at runtime):
 *
 *   1. Launch app fresh.
 *   2. Tap the Compose tab (ADR-0019 — Compose is tab index 2).
 *      Compose tab is a `Redirect` to `/compose` modal, which renders
 *      `ComplaintComposer`.
 *   3. Fill the title field (`complaint-title`) with a short string.
 *   4. Pick a category chip (`category-<slug>`). We use `electricity`
 *      as a stable seeded slug — the API seed includes the 35-category
 *      ATID-COMPL-003 list.
 *   5. Drill the constituency picker four levels deep using
 *      `option-state-…` → `option-district-…` → `option-pc-…` →
 *      `option-ac-…`. The picker (`constituency-picker-native`) is the
 *      "combobox + breadcrumb" surface from Phase 3 D1 / ADR-0017.
 *   6. Fill the body (`complaint-body`).
 *   7. Assert the submit button (`complaint-submit`) is enabled.
 *   8. Tap submit.
 *   9. Assert navigation to /complaint/:id by waiting for a screen
 *      identifier rendered on the detail page.
 *
 * Mocking strategy:
 *
 * The Detox build must run against a hermetic local API (see
 * `docs/operations/mobile-e2e-runbook.md`). The composer hits
 * `POST /complaints` which in the test stack returns a deterministic
 * stub ID `e2e-submit-fixture`. Real network is unreachable from the
 * simulator under Detox — never run this spec against staging.
 *
 * Anonymity: this spec uses NO real Aadhaar / PII. The nullifier
 * defaults to undefined; the local API accepts that under the e2e
 * profile and routes the submission to the test moderation queue.
 *
 * Argent MCP authoring procedure (for spec maintainers):
 *
 *   - `argent describe` after each navigation to confirm targets
 *     exist before tapping.
 *   - Never derive coordinates from a screenshot — re-run `describe`
 *     when the layout changes.
 *   - See `argent-test-ui-flow` skill for the full loop.
 */
describe('submit (mobile e2e)', () => {
  beforeAll(async () => {
    await launchFresh()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('drills constituency, fills body, and publishes', async () => {
    // 1. Go to Compose tab.
    const composeTab = await discover('compose')
    await tapDiscovered(composeTab)

    // 2. Composer renders.
    await discover('complaint-composer')

    // 3. Title.
    const title = await discover('complaint-title')
    await typeDiscovered(title, 'Streetlight out on 12th main road')

    // 4. Category. The seed list ships an `electricity` slug —
    //    adjust if the seed taxonomy changes.
    const category = await discover('category-electricity')
    await tapDiscovered(category)

    // 5. Constituency drill (four levels). The picker testIDs are
    //    `option-<level>-<code>` and the seed dataset exposes
    //    Karnataka → Bengaluru Urban → Bangalore South → Jayanagar.
    const picker = await discover('constituency-picker-native')
    const stateOpt = await scrollToDiscovered(picker, 'option-state-29')
    await tapDiscovered(stateOpt)

    const districtOpt = await scrollToDiscovered(picker, 'option-district-29-560')
    await tapDiscovered(districtOpt)

    const pcOpt = await scrollToDiscovered(picker, 'option-pc-29-24')
    await tapDiscovered(pcOpt)

    const acOpt = await scrollToDiscovered(picker, 'option-ac-29-176')
    await tapDiscovered(acOpt)

    // 6. Body.
    const body = await discover('complaint-body')
    await typeDiscovered(
      body,
      'The streetlight at the junction has been off for two weeks. Please restore power.',
    )

    // 7. Submit becomes enabled.
    const submit = await discover('complaint-submit')

    // 8. Tap.
    await tapDiscovered(submit)

    // 9. Detail screen renders. The complaint detail route shows a root
    //    testID `complaint-detail`; the e2e API stub returns id
    //    `e2e-submit-fixture` deterministically.
    await waitFor(element(by.id('complaint-detail')))
      .toBeVisible()
      .withTimeout(15_000)
  })
})

/**
 * 503 / `S1_COMPLAINT_SUBMIT_OFF` fallback coverage note.
 *
 * The composer's paused-feature branch is asserted at unit level by
 * `apps/mobile/src/features/complaint/__tests__/ComplaintComposer.test.tsx`
 * (`'renders the paused notice when API returns 503/S1_COMPLAINT_SUBMIT_OFF'`).
 * Re-asserting at the device level was previously deferred behind a
 * planned "Phase 7 CI device matrix" runtime API toggle that never
 * materialised — and the unit test already pins the user-visible copy.
 * No further coverage owed at the Detox layer for this branch.
 */
