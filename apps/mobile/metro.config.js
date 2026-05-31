/**
 * Metro bundler configuration for the Expo mobile app.
 *
 * - `getSentryExpoConfig` from Sentry builds on Expo's Metro defaults
 *   while enabling Sentry's React Native integration.
 * - Expo's Metro defaults provide CSS support and resolver tweaks for the
 *   monorepo.
 * - `withUniwindConfig` wires Uniwind into Metro so Tailwind v4 utilities
 *   work in React Native and HeroUI Native's internal styles are picked up
 *   via the `@source` directive in `global.css`.
 * - We explicitly mark the monorepo root and the package roots so Metro
 *   resolves workspace deps (`@factivist/*`) without symlink trickery.
 */
const path = require('node:path')

const { getSentryExpoConfig } = require('@sentry/react-native/metro')
const { withUniwindConfig } = require('uniwind/metro')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getSentryExpoConfig(projectRoot)

// Monorepo: watch the root so changes in packages/* trigger reloads.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), monorepoRoot])]

// Monorepo: resolve modules from the app first, then from the root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Keep hierarchical lookup enabled: Bun's `.bun/` isolated install layout
// does not hoist transitive peer deps (e.g. `@expo/log-box`) to the app's
// `node_modules`, so Metro needs to walk parent directories to find them.

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
})
