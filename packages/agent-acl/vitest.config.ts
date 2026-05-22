import nodeConfig from '@factivist/vitest-config/node'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  nodeConfig,
  defineConfig({
    test: {
      exclude: ['**/__tests__/_*.ts', 'node_modules/**', 'dist/**'],
      coverage: {
        exclude: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/types.ts', '**/index.ts'],
      },
    },
  }),
)
