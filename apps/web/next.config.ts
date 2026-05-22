import path from 'node:path'

import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@factivist/shared',
    '@factivist/ui-theme',
    '@factivist/ui-web',
    '@factivist/tailwind-config',
  ],
  turbopack: {
    root: path.join(import.meta.dirname, '..', '..'),
  },
}

export default config
