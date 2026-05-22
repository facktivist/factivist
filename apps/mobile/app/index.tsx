import { HomeScreen } from '../src/features/home/HomeScreen.tsx'

/**
 * Expo Router index route — `/`.
 *
 * Thin wrapper around the feature-module screen so the route file stays
 * trivial and the real implementation lives next to its tests under `src/`.
 */
export default function Index() {
  return <HomeScreen />
}
