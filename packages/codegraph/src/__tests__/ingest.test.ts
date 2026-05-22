import { describe, expect, it } from 'vitest'

import { _internals, buildSnapshot, writeSnapshot } from '../ingest/index.ts'

import { createFakeConn, createFixtureRoot, sampleSpec } from './_fixtures.ts'

describe('buildSnapshot', () => {
  it('produces a coherent snapshot from a fixture monorepo', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const snap = await buildSnapshot(root)
    expect(snap.packages).toHaveLength(3)
    expect(snap.files.length).toBeGreaterThan(0)
    expect(snap.contains.length).toBe(snap.files.length)
    expect(snap.defines.length).toBe(snap.symbols.length)
    expect(snap.imports.length).toBeGreaterThan(0)
    expect(snap.dependsOn.length).toBe(2)
    expect(snap.references).toEqual([])
  })
})

describe('writeSnapshot', () => {
  it('emits MERGE statements for nodes and edges', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const snap = await buildSnapshot(root)
    const conn = createFakeConn()
    await writeSnapshot({ conn, close: () => {} }, snap)
    const joined = conn.statements.join('\n')
    expect(joined).toContain('MERGE (n:Package')
    expect(joined).toContain('MERGE (n:File')
    expect(joined).toContain('MERGE (n:Symbol')
    expect(joined).toContain('[:CONTAINS]')
    expect(joined).toContain('[:DEPENDS_ON]')
    expect(joined).toContain('[r:IMPORTS]')
    expect(joined).toContain('[:DEFINES]')
  })

  it('escapes single quotes and backslashes in identifiers', () => {
    expect(_internals.escapeString(`it's a \\test`)).toBe(`it\\'s a \\\\test`)
  })

  it('serializes booleans as Cypher literals', () => {
    expect(_internals.bool(true)).toBe('true')
    expect(_internals.bool(false)).toBe('false')
  })

  it('statsOf returns one count per slice', async () => {
    const root = await createFixtureRoot(sampleSpec())
    const snap = await buildSnapshot(root)
    const stats = _internals.statsOf(snap)
    expect(stats.packages).toBe(snap.packages.length)
    expect(stats.files).toBe(snap.files.length)
    expect(stats.symbols).toBe(snap.symbols.length)
    expect(stats.imports).toBe(snap.imports.length)
    expect(stats.dependsOn).toBe(snap.dependsOn.length)
  })
})
