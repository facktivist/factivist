/**
 * Babel configuration for the Expo mobile app.
 *
 * - `babel-preset-expo` is required by Metro for Expo SDK 56+.
 * - `react-native-worklets/plugin` MUST be listed last; it powers Reanimated 4
 *   and gesture-handler worklets and rewrites function bodies in-place.
 */
module.exports = (api) => {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    plugins: ['react-native-worklets/plugin'],
  }
}
