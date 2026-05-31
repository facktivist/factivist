import nodeConfig from '@factivist/vitest-config/node'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  nodeConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          '**/*.test.*',
          '**/*.spec.*',
          '**/__tests__/**',
          '**/types.ts',
          '**/index.ts',
          'src/data/**',
        ],
      },
    },
  }),
)
