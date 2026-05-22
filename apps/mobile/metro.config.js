/**
 * Metro bundler configuration for the Expo mobile app.
 *
 * - `getDefaultConfig` from Expo provides the SDK 56 defaults (CSS support,
 *   resolver tweaks for the monorepo).
 * - `withUniwindConfig` wires Uniwind into Metro so Tailwind v4 utilities
 *   work in React Native and HeroUI Native's internal styles are picked up
 *   via the `@source` directive in `global.css`.
 * - We explicitly mark the monorepo root and the package roots so Metro
 *   resolves workspace deps (`@factivist/*`) without symlink trickery.
 */
const path = require('node:path')

const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Monorepo: watch the root so changes in packages/* trigger reloads.
config.watchFolders = [monorepoRoot]

// Monorepo: resolve modules from the app first, then from the root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Prevent Metro from following hoisted symlinks twice when resolving deps.
config.resolver.disableHierarchicalLookup = true

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
})
