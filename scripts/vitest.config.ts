import nodeConfig from '@factivist/vitest-config/node'
import { defineConfig, mergeConfig } from 'vitest/config'

/**
 * `scripts` is a flat CLI workspace — no `src/` directory.
 *
 * Each CLI lives at the package root (e.g. `llm-cost-logger.ts`) and is
 * owned by exactly one agent. Tests for a given CLI live under
 * `__tests__/<name>.test.ts`. Sibling sub-CLIs (e.g. `polygon-gas/`) ship
 * their own tests + coverage scopes — we intentionally limit coverage
 * here to the files this package owns so a partially-landed sibling
 * doesn't sink the gate.
 */
export default mergeConfig(
  nodeConfig,
  defineConfig({
    test: {
      include: ['__tests__/**/*.test.ts'],
      coverage: {
        include: ['*.ts'],
        exclude: [
          '**/*.test.*',
          '**/*.spec.*',
          '**/__tests__/**',
          'vitest.config.ts',
          'polygon-gas/**',
        ],
      },
    },
  }),
)
