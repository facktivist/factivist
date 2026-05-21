import { defineConfig, mergeConfig } from 'vitest/config'

import { baseConfig } from './base.ts'

/**
 * React-flavored Vitest configuration.
 *
 * - environment: jsdom (DOM globals for React Testing Library)
 * - setupFiles: @testing-library/jest-dom matchers
 *
 * Inherits all coverage thresholds and includes from `baseConfig`.
 */
export const reactConfig = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['@testing-library/jest-dom/vitest'],
    },
  }),
)

export default reactConfig
