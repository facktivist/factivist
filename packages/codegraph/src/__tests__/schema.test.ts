import { describe, expect, it } from 'vitest'

import { SCHEMA_STATEMENTS, SCHEMA_VERSION } from '../schema/index.ts'

describe('schema', () => {
  it('exposes a stable version string', () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('declares node tables before rel tables', () => {
    const firstRel = SCHEMA_STATEMENTS.findIndex((s) => s.includes('CREATE REL'))
    let lastNode = -1
    SCHEMA_STATEMENTS.forEach((s, i) => {
      if (s.includes('CREATE NODE')) lastNode = i
    })
    expect(firstRel).toBeGreaterThan(lastNode)
  })

  it('covers every required node and rel label', () => {
    const joined = SCHEMA_STATEMENTS.join('\n')
    for (const label of ['Package', 'File', 'Symbol']) {
      expect(joined).toContain(`CREATE NODE TABLE IF NOT EXISTS ${label}`)
    }
    for (const rel of ['CONTAINS', 'DEPENDS_ON', 'IMPORTS', 'DEFINES', 'REFERENCES']) {
      expect(joined).toContain(`CREATE REL TABLE IF NOT EXISTS ${rel}`)
    }
  })

  it('marks every node table with a primary key', () => {
    const nodes = SCHEMA_STATEMENTS.filter((s) => s.includes('CREATE NODE'))
    for (const stmt of nodes) {
      expect(stmt).toMatch(/PRIMARY KEY\(id\)/)
    }
  })
})
