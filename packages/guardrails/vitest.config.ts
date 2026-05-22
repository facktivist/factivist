import nodeConfig from '@factivist/vitest-config/node'
import { defineConfig, mergeConfig } from 'vitest/config'

/**
 * Excludes the CLI bootstrap (`src/cli.ts` — `if (import.meta.main)` is
 * unreachable from vitest; the testable command handlers are covered
 * separately) and helper fixtures prefixed with `_` inside `__tests__/`.
 */
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
