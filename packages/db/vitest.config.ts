import nodeConfig from '@factivist/vitest-config/node'
import { defineConfig, mergeConfig } from 'vitest/config'

/**
 * The migration runners (`migrate.ts`, `migrate-age.ts`) end with an
 * `if (import.meta.main)` block that boots the script when invoked directly.
 * That branch is not reachable from vitest — we cover the underlying logic
 * via the exported `run`/`applyAgeMigrations` paths instead.
 */
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
          'src/seed/**',
        ],
      },
    },
  }),
)
