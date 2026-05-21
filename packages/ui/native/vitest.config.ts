import nodeConfig from '@factivist/vitest-config/node'

// Native package contains no DOM-bound code — its components are
// re-export shims and its `useTheme()` reads from a mocked react-native
// `Appearance` API. The Node environment is sufficient (and avoids pulling
// jsdom into a tree that never touches `document`).
export default nodeConfig
