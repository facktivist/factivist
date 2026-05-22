import { expect, test } from '@playwright/test'

test('landing page renders and CTA toggles', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Welcome to Factivist' })).toBeVisible()

  const cta = page.getByTestId('cta-button')
  await expect(cta).toBeVisible()
  await expect(cta).toHaveText('Get started')

  await cta.click()
  await expect(cta).toHaveText('Thanks!')
  await expect(cta).toHaveAttribute('aria-pressed', 'true')
})
