import path from 'node:path'

import reactConfig from '@factivist/vitest-config/react'
import { defineConfig, mergeConfig } from 'vitest/config'

/**
 * Vitest configuration for the Expo mobile app.
 *
 * - Inherits jsdom + 95% coverage thresholds from `@factivist/vitest-config`.
 * - Aliases `react-native` and `react-native-safe-area-context` to lightweight
 *   web shims so Testing Library RN can mount components without a Metro
 *   bundler. This is the canonical Vitest-on-RN approach (Detox handles the
 *   real native runtime, see `e2e/`).
 */
export default mergeConfig(
  reactConfig,
  defineConfig({
    resolve: {
      alias: {
        'react-native': path.resolve(__dirname, './src/__tests__/shims/react-native.tsx'),
        'react-native-safe-area-context': path.resolve(
          __dirname,
          './src/__tests__/shims/safe-area-context.tsx',
        ),
        'react-native-gesture-handler': path.resolve(
          __dirname,
          './src/__tests__/shims/gesture-handler.tsx',
        ),
        'heroui-native': path.resolve(__dirname, './src/__tests__/shims/heroui-native.tsx'),
      },
    },
    oxc: {
      jsx: {
        runtime: 'automatic',
      },
    },
    test: {
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/shims/**', 'e2e/**', '.expo/**'],
      coverage: {
        // Exclude shims, route entries, and the layout wrapper — pure
        // composition with no logic, exercised by Detox E2E.
        exclude: [
          '**/*.test.*',
          '**/*.spec.*',
          '**/__tests__/**',
          '**/types.ts',
          '**/index.ts',
          'app/**',
          'src/**/shims/**',
        ],
      },
    },
  }),
)
