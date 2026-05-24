/// <reference types="detox" />

import { discover, launchFresh } from './support/argent.ts'

/**
 * Phase 6 §6.4 — Discovery feed browse smoke.
 *
 * Flow (Argent-driven authoring; encoded against Detox at runtime):
 *
 *   1. Launch app fresh — Home is tab index 0 (default).
 *   2. Assert `DiscoveryScreen` mounts (`discovery-screen` SafeArea).
 *   3. With the e2e API stack seeded (see runbook), assert at least
 *      one complaint row is visible. The stub seeds a deterministic
 *      complaint with id `e2e-browse-fixture`, so we wait for
 *      `complaint-row-e2e-browse-fixture` to appear.
 *
 * The full filter UI (state / district / PC / AC / category) is a
 * follow-up wave per `DiscoveryScreen.tsx` comment; this spec covers
 * the unfiltered default render only.
 *
 * Anonymity: the seed fixture uses author handle `e2e-author` and no
 * PII. See `apps/api/__tests__/discovery/seed.ts` (Phase 7).
 *
 * Argent MCP authoring procedure (for spec maintainers):
 *
 *   - `argent describe` immediately after launch to confirm the Home
 *     tab is the active route (not Search/Profile from a prior run).
 *   - If the row layout changes, re-run `describe` to pick up new
 *     testIDs before updating the spec.
 */
describe('browse (mobile e2e)', () => {
  beforeAll(async () => {
    await launchFresh()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('renders the discovery feed with seeded complaints', async () => {
    await discover('discovery-screen')

    // Wait up to 10s for the React Query fetch to settle. The local
    // API in the e2e profile responds inside ~200ms; the wider window
    // absorbs simulator cold-start jitter.
    await waitFor(element(by.id('complaint-row-e2e-browse-fixture')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('shows the empty state when no complaints match (skipped)', async () => {
    // Requires runtime filter UI not yet wired in the Phase 5 stub.
    // Re-enable once the filter chips ship.
  })
})
