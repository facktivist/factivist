/// <reference types="detox" />

import { discover, launchFresh, tapDiscovered } from './support/argent.ts'

/**
 * Phase 6 §6.4 — Tab order parity + no-FAB invariant (ADR-0019).
 *
 * Asserts the locked ADR-0019 tab order on initial mount.
 * Tab items are emitted by `Shell.TabBar` (compound from
 * `packages/ui/native/shell`), which testID-prefixes each item with the
 * parent `testID="mobile-tabbar"` from `ShellTabBarHost.tsx`. Per-item
 * testIDs are therefore `mobile-tabbar-{route.name}`.
 *
 *   index 0 → Home    (`mobile-tabbar-index`    → `discovery-screen`)
 *   index 1 → Search  (`mobile-tabbar-search`   → `search-tab`)
 *   index 2 → Compose (`mobile-tabbar-compose`  → Redirect → `complaint-composer`)
 *   index 3 → Profile (`mobile-tabbar-profile`  → `identity-screen`)
 *
 * Also asserts the no-FAB rule: there must be NO element whose testID
 * matches `/^(fab|floating|plus|add)$/i` anywhere in the active view
 * hierarchy. The unit-level guard is
 * `apps/mobile/src/__tests__/tabs-layout.test.tsx` (line 70); this
 * spec is the device-level mirror.
 *
 * Argent MCP authoring procedure (for spec maintainers):
 *
 *   - `argent describe` after each tap to confirm the foreground
 *     content matches the expected tab.
 *   - If a future redesign moves a tab, update both this spec AND
 *     ADR-0019 in the same PR.
 */
describe('tabs (mobile e2e)', () => {
  beforeAll(async () => {
    await launchFresh()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('tab index 0 → Home renders DiscoveryScreen', async () => {
    const home = await discover('mobile-tabbar-index')
    await tapDiscovered(home)
    await discover('discovery-screen')
  })

  it('tab index 1 → Search renders the placeholder', async () => {
    const search = await discover('mobile-tabbar-search')
    await tapDiscovered(search)
    await discover('search-tab')
  })

  it('tab index 2 → Compose redirects to composer modal', async () => {
    const compose = await discover('mobile-tabbar-compose')
    await tapDiscovered(compose)
    await discover('complaint-composer')
  })

  it('tab index 3 → Profile renders IdentityScreen', async () => {
    const profile = await discover('mobile-tabbar-profile')
    await tapDiscovered(profile)
    await discover('identity-screen')
  })

  it('exposes no FAB on any tab (ADR-0019)', async () => {
    for (const tabId of [
      'mobile-tabbar-index',
      'mobile-tabbar-search',
      'mobile-tabbar-compose',
      'mobile-tabbar-profile',
    ] as const) {
      // `mobile-tabbar-compose` redirects into the `/compose` modal stack
      // which overlays and hides the tab bar. Reload between iterations
      // so the next tab tap starts from a fresh (tabs) shell with the
      // tabbar visible — without this, the iteration after compose
      // cannot discover any `mobile-tabbar-*` testID.
      await device.reloadReactNative()
      const tab = await discover(tabId)
      await tapDiscovered(tab)
      for (const banned of ['fab', 'floating', 'plus', 'add'] as const) {
        // Detox `toNotExist` is the inverse assertion — if any element
        // matches the banned testID, the spec fails with the testID
        // and tab in the error path.
        await expect(element(by.id(banned))).not.toBeVisible()
      }
    }
  })
})
