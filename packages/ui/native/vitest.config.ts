import nodeConfig from '@factivist/vitest-config/node'
import { defineConfig, mergeConfig } from 'vitest/config'

/**
 * Native components that use React hooks (`useState`, `useEffect`) cannot
 * be exercised end-to-end in a Node test environment without `react-test-
 * renderer`. Hook-bound stateful UI is covered at the Detox E2E level on
 * iOS + Android device snapshots; the local tests exercise pure helpers
 * (`__buildCommentTree`, `formatComplaintDate`, the `STAGE_LABEL` map,
 * etc.) plus the compound-namespace shape.
 *
 * Excluding the stateful slot files locally keeps the coverage gate
 * honest for everything else. The Detox suite is the authoritative gate.
 */
export default mergeConfig(
  nodeConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          'src/comment/Comment.tsx',
          'src/complaint/Complaint.tsx',
          'src/filter/Filter.tsx',
          'src/onboarding/Onboarding.tsx',
        ],
      },
    },
  }),
)
