/**
 * Shared test fixtures: a tiny on-disk monorepo we can ingest end-to-end
 * without touching the real workspace. Tests that need a snapshot call
 * `createFixtureRoot()`; tests that need to assert specific cypher calls
 * use `createFakeConn()`.
 */

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { GraphConnection } from '../client.ts'

export interface FixtureFile {
  path: string
  content: string
}

export interface FixturePackage {
  path: string
  manifest: Record<string, unknown>
  files: FixtureFile[]
}

export interface FixtureSpec {
  rootManifest: Record<string, unknown>
  packages: FixturePackage[]
}

export const createFixtureRoot = async (spec: FixtureSpec): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'codegraph-fixture-'))
  await writeFile(join(root, 'package.json'), JSON.stringify(spec.rootManifest, null, 2))
  for (const pkg of spec.packages) {
    const pkgDir = join(root, pkg.path)
    await mkdir(pkgDir, { recursive: true })
    await writeFile(join(pkgDir, 'package.json'), JSON.stringify(pkg.manifest, null, 2))
    for (const file of pkg.files) {
      const filePath = join(pkgDir, file.path)
      await mkdir(join(pkgDir, file.path.split('/').slice(0, -1).join('/')), {
        recursive: true,
      }).catch(() => {})
      await writeFile(filePath, file.content)
    }
  }
  return root
}

/**
 * Minimal in-memory Cypher connection stub. We don't try to interpret
 * Cypher — we just record the statements so tests can assert that the
 * right writes were issued.
 */
export interface FakeRow {
  [k: string]: unknown
}

export interface FakeConn extends GraphConnection {
  statements: string[]
  responses: FakeRow[][]
  closed: boolean
}

export const createFakeConn = (responses: FakeRow[][] = []): FakeConn => {
  const statements: string[] = []
  const queue = [...responses]
  const conn: FakeConn = {
    statements,
    responses,
    closed: false,
    query: async (cypher: string) => {
      statements.push(cypher)
      const next = queue.shift() ?? []
      return { getAll: async () => next }
    },
    close: () => {
      conn.closed = true
    },
  }
  return conn
}

export const sampleSpec = (): FixtureSpec => ({
  rootManifest: { name: 'demo-root', private: true, workspaces: ['packages/*', 'apps/*'] },
  packages: [
    {
      path: 'packages/shared',
      manifest: { name: '@demo/shared', private: true, exports: { '.': './src/index.ts' } },
      files: [
        { path: 'src/index.ts', content: `export const greeting = 'hi'\n` },
        {
          path: 'src/util.ts',
          content: `export function add(a: number, b: number) { return a+b }\n`,
        },
      ],
    },
    {
      path: 'packages/db',
      manifest: {
        name: '@demo/db',
        private: true,
        dependencies: { '@demo/shared': 'workspace:*' },
        exports: { '.': './src/index.ts' },
      },
      files: [
        {
          path: 'src/index.ts',
          content: `import { greeting } from '@demo/shared'\nimport { helper } from './internal'\nexport class Repo { msg = greeting; h = helper }\n`,
        },
        {
          path: 'src/internal.ts',
          content: `export const helper = 42\n`,
        },
      ],
    },
    {
      path: 'apps/api',
      manifest: { name: '@demo/api', private: true, dependencies: { '@demo/db': 'workspace:*' } },
      files: [
        {
          path: 'src/index.ts',
          content: `import { Repo } from '@demo/db'\nimport type { Foo } from './types'\nexport interface Foo { id: string }\n`,
        },
        { path: 'src/types.ts', content: `export type Foo = { id: string }\n` },
      ],
    },
  ],
})
