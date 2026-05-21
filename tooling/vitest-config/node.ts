import { defineConfig, mergeConfig } from 'vitest/config';

import { baseConfig } from './base.ts';

/**
 * Node-flavored Vitest configuration.
 *
 * - environment: node (for API, server, and pure-TS packages)
 *
 * Inherits all coverage thresholds and includes from `baseConfig`.
 */
export const nodeConfig = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'node',
    },
  }),
);

export default nodeConfig;
