import { defineConfig } from 'vitest/config'

/**
 * Local override of the workspace base config.
 *
 * Phase 7 carry-over #3 (qa-lead `gap-analysis.md` action D2):
 * The workspace base config (`tooling/vitest-config/base.ts:21-28`) excludes
 * `**\/index.ts` from coverage because every other package's `index.ts` is a
 * pure barrel re-export. `@factivist/zkp-client` is the exception — its
 * entire public surface (verifier, platform detection, key injection,
 * backend slots) is implemented in `src/index.ts`. With the workspace
 * exclude in place, the 21 tests in `src/__tests__/verify-proof.test.ts`
 * produced a vacuous `0/0` coverage report.
 *
 * We replicate the base config but drop only the `**\/index.ts` exclude
 * (vitest's `mergeConfig` concatenates arrays — replacement requires a
 * fresh `defineConfig` rather than a merge). All other workspace excludes
 * + thresholds are preserved verbatim so the package is held to the same
 * 95L / 95F / 95S / 90B gate as every other package.
 */
export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
    include: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/**',
        '**/types.ts',
        '**/*.types.ts',
        // Intentionally NOT excluding '**/index.ts' — it is the implementation here.
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 90,
      },
    },
  },
})
