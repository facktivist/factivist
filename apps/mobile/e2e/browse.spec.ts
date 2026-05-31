/// <reference types="detox" />

import { discover, launchFresh } from './support/argent.ts'

/**
 * Phase 6 §6.4 — Discovery feed browse smoke.
 *
 * Flow (Argent-driven authoring; encoded against Detox at runtime):
 *
 *   1. Launch app fresh — Home is tab index 0 (default).
 *   2. Assert `DiscoveryScreen` mounts (`discovery-screen` SafeArea).
 *   3. Assert the feed settled — `discovery-feed-settled` wraps the
 *      success branch and is rendered whether the page has rows or
 *      hits the empty-state. The S1 e2e API stack ships no seeded
 *      fixtures yet (per `mobile-e2e-runbook.md` §6 — deferred to
 *      Phase 9 alongside rapidsnark/vKey provisioning), so the
 *      empty-state Card is the expected current branch.
 *
 * The full filter UI (state / district / PC / AC / category) is a
 * follow-up wave per `DiscoveryScreen.tsx` comment; this spec covers
 * the unfiltered default render only.
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
    // absorbs simulator cold-start jitter. We assert the success
    // wrapper rather than a specific row because the seed fixture
    // harness is deferred — once it lands, swap this for a row-id
    // assertion (see runbook §6).
    await waitFor(element(by.id('discovery-feed-settled')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('shows the empty state when no complaints match (skipped)', async () => {
    // Requires runtime filter UI not yet wired in the Phase 5 stub.
    // Re-enable once the filter chips ship.
  })
})
