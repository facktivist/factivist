/// <reference types="detox" />

/**
 * End-to-end smoke test for the legacy Phase 5 `HomeScreen` placeholder.
 *
 * `src/features/home/HomeScreen.tsx` is no longer routed — `(tabs)/index.tsx`
 * renders `DiscoveryScreen` instead (the spec for that lives in
 * `browse.spec.ts`). This file is preserved as the documented reference
 * for the original `by.id(...).tap()` Detox matcher pattern that the
 * Argent-style discover helper supersedes; see `jest.config.js` header.
 *
 * Skipped at the suite level so CI stays green. Re-enable only if/when
 * HomeScreen gets routed again.
 */
describe.skip('Home screen (legacy, HomeScreen no longer routed)', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('renders SafeAreaView root + scroll container', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible()
    await expect(element(by.id('home-scroll'))).toBeVisible()
  })

  it('toggles the CTA label from "Get started" to "Thanks!"', async () => {
    const cta = element(by.id('cta-button'))
    await expect(cta).toBeVisible()
    await expect(cta).toHaveLabel('Get started')

    await cta.tap()

    await expect(cta).toHaveLabel('Thanks!')
  })
})
