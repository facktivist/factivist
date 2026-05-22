import { afterEach, describe, expect, it } from 'vitest'

import { __setKuzuLoaderForTests, openGraph, openInMemoryGraph } from '../client.ts'
import { SCHEMA_STATEMENTS } from '../schema/index.ts'

const buildFakeKuzu = () => {
  const statements: string[] = []
  let closed = false
  const FakeConnection = class {
    constructor(_db: unknown) {}
    async query(cypher: string) {
      statements.push(cypher)
      return { getAll: async () => [] }
    }
    close() {
      closed = true
    }
  }
  const FakeDatabase = class {
    constructor(public path: string) {}
  }
  return {
    statements,
    isClosed: () => closed,
    module: { Database: FakeDatabase, Connection: FakeConnection },
  }
}

afterEach(() => {
  __setKuzuLoaderForTests(async () => (await import('kuzu')) as never)
})

describe('openGraph', () => {
  it('applies every schema statement in order', async () => {
    const fake = buildFakeKuzu()
    __setKuzuLoaderForTests(async () => fake.module)
    const handle = await openGraph('/tmp/graph.kuzu')
    expect(fake.statements).toEqual([...SCHEMA_STATEMENTS])
    handle.close()
    expect(fake.isClosed()).toBe(true)
  })

  it('openInMemoryGraph passes :memory: to the Database constructor', async () => {
    let recordedPath = ''
    const FakeDb = class {
      constructor(p: string) {
        recordedPath = p
      }
    }
    const FakeConn = class {
      constructor(_db: unknown) {}
      async query() {
        return { getAll: async () => [] }
      }
      close() {}
    }
    __setKuzuLoaderForTests(async () => ({
      Database: FakeDb as unknown as new (p: string) => unknown,
      Connection: FakeConn as unknown as new (
        db: unknown,
      ) => {
        query: (s: string) => Promise<{ getAll: () => Promise<unknown[]> }>
        close: () => void
      },
    }))
    await openInMemoryGraph()
    expect(recordedPath).toBe(':memory:')
  })
})
