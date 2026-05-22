import { describe, expect, it } from 'vitest'
import { ageDdlOutsideMigration } from '../registry/age-ddl-outside-migration.ts'
import { crossAppImport } from '../registry/cross-app-import.ts'
import { envFile, isEnvFileName } from '../registry/env-file.ts'
import { ALL, byName } from '../registry/index.ts'
import { migrationPort } from '../registry/migration-port.ts'
import { secretLeak } from '../registry/secret-leak.ts'

import { buildCtx, inMemoryReader } from './_fixtures.ts'

describe('registry index', () => {
  it('exposes every built-in by stable name', () => {
    expect(ALL.map((g) => g.name).sort()).toEqual([
      'age-ddl-outside-migration',
      'cross-app-import',
      'env-file',
      'migration-port',
      'secret-leak',
    ])
  })

  it('byName resolves and rejects gracefully', () => {
    expect(byName('env-file')?.name).toBe('env-file')
    expect(byName('nope')).toBeUndefined()
  })
})

describe('env-file', () => {
  it('passes when no env files are staged', async () => {
    const out = await envFile.run(buildCtx({ stagedFiles: ['src/x.ts'] }))
    expect(out.ok).toBe(true)
  })

  it('blocks .env in any directory', async () => {
    const out = await envFile.run(buildCtx({ stagedFiles: ['.env', 'apps/web/.env'] }))
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.details?.[0]).toMatch(/env file committed/)
  })

  it('blocks .env.production and similar variants', async () => {
    const out = await envFile.run(buildCtx({ stagedFiles: ['.env.production', '.env.local'] }))
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.reason).toMatch(/2 env file/)
  })

  it('permits .env.example as a template', async () => {
    const out = await envFile.run(buildCtx({ stagedFiles: ['.env.example'] }))
    expect(out.ok).toBe(true)
  })

  it('accepts no bypass classes — sudo cannot override it', () => {
    expect(envFile.acceptsBypass).toEqual([])
  })

  it('isEnvFileName matches .env variants but not .env.example', () => {
    expect(isEnvFileName('.env')).toBe(true)
    expect(isEnvFileName('.env.local')).toBe(true)
    expect(isEnvFileName('.env.example')).toBe(false)
    expect(isEnvFileName('config.ts')).toBe(false)
  })
})

describe('secret-leak', () => {
  it('passes when no staged files contain secrets', async () => {
    const out = await secretLeak.run(buildCtx({ stagedFiles: [] }))
    expect(out.ok).toBe(true)
  })

  it('flags AWS, GitHub, OpenAI, Anthropic, Stripe keys, JWTs, and private key blocks', async () => {
    const samples: Record<string, string> = {
      'a.ts': 'const k = "AKIAIOSFODNN7EXAMPLE"',
      'b.ts': 'const k = "ghp_abcdefghijklmnopqrstuvwxyzabcdefghij"',
      'c.ts': `const k = "sk_live${'_'}abcdefghijklmnopqrstu123"`,
      'd.ts': 'const k = "sk-abcdefghijklmnopqrstuvwxyz0123456789"',
      'e.ts': 'const k = "sk-ant-abcdefghijklmnopqrst"',
      'f.ts': 'const k = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-DEFghi"',
      'g.ts': '-----BEGIN RSA PRIVATE KEY-----\nMIIB',
    }
    const out = await secretLeak.run(
      buildCtx({ stagedFiles: Object.keys(samples), readFile: inMemoryReader(samples) }),
    )
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.details?.length).toBe(Object.keys(samples).length)
  })

  it('skips files it cannot read', async () => {
    const out = await secretLeak.run(
      buildCtx({
        stagedFiles: ['missing.ts'],
        readFile: async () => {
          throw new Error('nope')
        },
      }),
    )
    expect(out.ok).toBe(true)
  })

  it('accepts sudo bypass for false-positive overrides', () => {
    expect(secretLeak.acceptsBypass).toEqual(['sudo'])
  })
})

describe('cross-app-import', () => {
  it('passes when no staged files cross app boundaries', async () => {
    const out = await crossAppImport.run(buildCtx({ stagedFiles: [] }))
    expect(out.ok).toBe(true)
  })

  it('fails when packages/* imports from @factivist/api', async () => {
    const out = await crossAppImport.run(
      buildCtx({
        stagedFiles: ['packages/db/src/index.ts'],
        readFile: inMemoryReader({
          'packages/db/src/index.ts':
            "import { x } from '@factivist/api/routes'\nexport const v = 1",
        }),
      }),
    )
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.details?.[0]).toMatch(/packages\/\* may not import/)
  })

  it('fails when apps/web imports from @factivist/api', async () => {
    const out = await crossAppImport.run(
      buildCtx({
        stagedFiles: ['apps/web/src/page.tsx'],
        readFile: inMemoryReader({
          'apps/web/src/page.tsx':
            "import { x } from '@factivist/api/handlers'\nexport default function P() { return null }",
        }),
      }),
    )
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.details?.[0]).toMatch(
      /apps\/web may not import from @factivist\/api/,
    )
  })

  it('ignores TS files outside apps/ and packages/', async () => {
    const out = await crossAppImport.run(
      buildCtx({
        stagedFiles: ['scripts/dev.ts'],
        readFile: inMemoryReader({
          'scripts/dev.ts': "import { x } from '@factivist/api'\n",
        }),
      }),
    )
    expect(out.ok).toBe(true)
  })

  it('passes when apps/web imports from itself (same app)', async () => {
    const out = await crossAppImport.run(
      buildCtx({
        stagedFiles: ['apps/web/src/page.tsx'],
        readFile: inMemoryReader({
          'apps/web/src/page.tsx':
            "import { x } from '@factivist/web/sibling'\nexport default function P() { return null }",
        }),
      }),
    )
    expect(out.ok).toBe(true)
  })

  it('passes when apps/web imports from a non-app package', async () => {
    const out = await crossAppImport.run(
      buildCtx({
        stagedFiles: ['apps/web/src/page.tsx'],
        readFile: inMemoryReader({
          'apps/web/src/page.tsx':
            "import { users } from '@factivist/db/schema'\nexport default function P() { return null }",
        }),
      }),
    )
    expect(out.ok).toBe(true)
  })

  it('ignores non-TS files and unreadable files', async () => {
    const out = await crossAppImport.run(
      buildCtx({
        stagedFiles: ['apps/web/README.md', 'apps/web/src/missing.ts'],
        readFile: async (p) => {
          if (p.endsWith('README.md')) return '# hi'
          throw new Error('nope')
        },
      }),
    )
    expect(out.ok).toBe(true)
  })

  it('accepts experiment and sudo bypasses', () => {
    expect(crossAppImport.acceptsBypass).toEqual(['experiment', 'sudo'])
  })

  it('exposes namespace helpers for direct use', async () => {
    const mod = await import('../registry/cross-app-import.ts')
    expect(mod.fileNamespace('apps/web/x.ts')).toBe('app')
    expect(mod.fileNamespace('packages/db/x.ts')).toBe('package')
    expect(mod.fileNamespace('docs/x.md')).toBe('other')
    expect(mod.appOf('apps/api/handler.ts')).toBe('api')
    expect(mod.appOf('packages/db/x.ts')).toBeUndefined()
    expect(mod.importLooksLikeApp('@factivist/api')).toBe(true)
    expect(mod.importLooksLikeApp('@factivist/api/sub')).toBe(true)
    expect(mod.importLooksLikeApp('@factivist/db')).toBe(false)
    expect(mod.importLooksLikeApp('lodash')).toBe(false)
    expect(mod.importedAppName('@factivist/web/page')).toBe('web')
    expect(mod.importedAppName('@factivist/db')).toBeUndefined()
  })
})

describe('migration-port', () => {
  it('passes when DATABASE_URL targets the direct port', async () => {
    const out = await migrationPort.run(
      buildCtx({ env: { DATABASE_URL: 'postgres://host:5432/db' } }),
    )
    expect(out.ok).toBe(true)
  })

  it('fails when DATABASE_URL targets the pooled port', async () => {
    const out = await migrationPort.run(
      buildCtx({ env: { DATABASE_URL: 'postgres://host:6543/db' } }),
    )
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.reason).toMatch(/pooled endpoint/)
  })

  it('fails when DATABASE_URL is unset', async () => {
    const out = await migrationPort.run(buildCtx({ env: {} }))
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.reason).toMatch(/DATABASE_URL is unset/)
  })

  it('does not match :6543 inside passwords or query params', async () => {
    const out = await migrationPort.run(
      buildCtx({ env: { DATABASE_URL: 'postgres://user:pw6543x@host:5432/db' } }),
    )
    expect(out.ok).toBe(true)
  })

  it('accepts local and sudo bypasses', () => {
    expect(migrationPort.acceptsBypass).toEqual(['local', 'sudo'])
  })
})

describe('age-ddl-outside-migration', () => {
  it('passes when no staged files mention AGE DDL', async () => {
    const out = await ageDdlOutsideMigration.run(
      buildCtx({
        stagedFiles: ['apps/api/src/index.ts'],
        readFile: inMemoryReader({ 'apps/api/src/index.ts': 'export const x = 1' }),
      }),
    )
    expect(out.ok).toBe(true)
  })

  it('passes when DDL lives inside the migration folder', async () => {
    const out = await ageDdlOutsideMigration.run(
      buildCtx({
        stagedFiles: ['packages/db/drizzle/age/0002_new.sql'],
        readFile: inMemoryReader({
          'packages/db/drizzle/age/0002_new.sql':
            "SELECT ag_catalog.create_vlabel('factivist_kg', 'X');",
        }),
      }),
    )
    expect(out.ok).toBe(true)
  })

  it('fails when DDL lives outside the migration folder', async () => {
    const out = await ageDdlOutsideMigration.run(
      buildCtx({
        stagedFiles: ['apps/api/src/bootstrap.ts'],
        readFile: inMemoryReader({
          'apps/api/src/bootstrap.ts':
            'await sql.unsafe("SELECT ag_catalog.create_graph(\'rogue\')");',
        }),
      }),
    )
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.details?.[0]).toMatch(/AGE DDL outside migration directory/)
  })

  it('skips files it cannot read and non-code paths', async () => {
    const out = await ageDdlOutsideMigration.run(
      buildCtx({
        stagedFiles: ['docs/notes.md', 'apps/api/missing.ts'],
        readFile: async (p) => {
          if (p.endsWith('notes.md')) return 'create_graph(... explanation)'
          throw new Error('nope')
        },
      }),
    )
    expect(out.ok).toBe(true)
  })

  it('also scans .tsx and .sql files outside the migration folder', async () => {
    const out = await ageDdlOutsideMigration.run(
      buildCtx({
        stagedFiles: ['apps/web/page.tsx', 'scripts/raw.sql'],
        readFile: inMemoryReader({
          'apps/web/page.tsx': '// noop',
          'scripts/raw.sql': "SELECT create_graph('rogue');",
        }),
      }),
    )
    expect(out.ok).toBe(false)
    expect(out.ok === false && out.details?.[0]).toMatch(/scripts\/raw\.sql/)
  })

  it('accepts no bypass', () => {
    expect(ageDdlOutsideMigration.acceptsBypass).toEqual([])
  })

  it('looksLikeCodePath recognizes .ts/.tsx/.sql and skips other extensions', async () => {
    const { looksLikeCodePath } = await import('../registry/age-ddl-outside-migration.ts')
    expect(looksLikeCodePath('a.ts')).toBe(true)
    expect(looksLikeCodePath('a.tsx')).toBe(true)
    expect(looksLikeCodePath('a.sql')).toBe(true)
    expect(looksLikeCodePath('a.md')).toBe(false)
  })
})
