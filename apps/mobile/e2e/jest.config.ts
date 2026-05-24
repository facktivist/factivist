/**
 * Jest config for Detox E2E tests.
 *
 * Detox bundles its own Jest runner; Vitest covers unit tests under
 * `__tests__/`. They never share code.
 *
 * NOTE: the Phase 6 spec set (`onboarding.spec.ts`, `submit.spec.ts`,
 * `browse.spec.ts`, `tabs.spec.ts`, `permissions.spec.ts`) is written
 * against the Argent MCP `describe` → `gesture-tap` pattern per the
 * `argent.md` project rule. The legacy `home.spec.ts` keeps the original
 * Detox matcher style (`by.id(...).tap()`) as a documented reference —
 * both patterns work under this runner.
 */
import type { Config } from 'jest'

const config: Config = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.spec.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
}

export default config
