/// <reference types="detox" />

/**
 * End-to-end smoke test for the Home screen.
 *
 * Validates the same surface the Vitest unit tests cover, but on a real
 * simulator/emulator so we exercise HeroUI Native, Reanimated worklets,
 * and Uniwind's Metro pipeline end-to-end.
 */
describe('Home screen', () => {
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
