import { defineConfig } from 'vitest/config'

/**
 * Base Vitest configuration shared across all Factivist packages.
 *
 * Enforces project-wide coverage thresholds:
 *   - lines:      ≥ 95%
 *   - functions:  ≥ 95%
 *   - statements: ≥ 95%
 *   - branches:   ≥ 90%
 */
export const baseConfig = defineConfig({
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
        '**/index.ts',
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

export default baseConfig
