import reactConfig from '@factivist/vitest-config/react'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  reactConfig,
  defineConfig({
    oxc: {
      jsx: {
        runtime: 'automatic',
      },
    },
    test: {
      setupFiles: ['./vitest.setup.ts'],
    },
  }),
)
