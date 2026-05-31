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
 *
 * Kept as .js (CommonJS) on purpose: the repo's base tsconfig sets
 * `verbatimModuleSyntax: true`, which conflicts with Detox's CommonJS
 * jest runner when ts-node loads a .ts config.
 */
/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.spec.ts'],
  // 5 min per test/hook. iOS simulator cold launches can take 60-90 s
  // (Metro bundle delivery + native init), and a few specs pay a one-time
  // network-sync settle cost on `device.launchApp({newInstance:true})`.
  testTimeout: 300000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
}
