import nodeConfig from '@factivist/vitest-config/node'
import { defineConfig, mergeConfig } from 'vitest/config'

/**
 * Codegraph extends the shared node config to:
 *   - skip helper modules inside `__tests__/` (prefixed with `_`) that would
 *     otherwise be reported as empty test suites,
 *   - exclude the CLI bootstrap and native-binding wrapper from coverage:
 *     `cli.ts` ends with a fire-and-forget `main()` entry that can't be
 *     reached from vitest without spawning, and `client.ts` is a thin
 *     adapter over the native `kuzu` package that we mock everywhere else.
 *     Both have their useful logic factored into pure exports tested in
 *     `cli.test.ts` / `client.test.ts`.
 */
export default mergeConfig(
  nodeConfig,
  defineConfig({
    test: {
      exclude: ['**/__tests__/_*.ts', 'node_modules/**', 'dist/**'],
      coverage: {
        exclude: [
          '**/*.test.*',
          '**/*.spec.*',
          '**/__tests__/**',
          '**/types.ts',
          '**/index.ts',
          'src/cli.ts',
          'src/client.ts',
        ],
      },
    },
  }),
)
