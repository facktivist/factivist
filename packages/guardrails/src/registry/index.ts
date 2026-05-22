/**
 * Registry of built-in guardrails. Adding a new guardrail = one file in this
 * directory + one entry in `ALL`. The `byName` lookup is what the CLI uses
 * to invoke a single guardrail without importing the whole list.
 */

import type { Guardrail } from '../types.ts'

import { ageDdlOutsideMigration } from './age-ddl-outside-migration.ts'
import { crossAppImport } from './cross-app-import.ts'
import { envFile } from './env-file.ts'
import { migrationPort } from './migration-port.ts'
import { secretLeak } from './secret-leak.ts'

export const ALL: readonly Guardrail[] = [
  envFile,
  secretLeak,
  crossAppImport,
  migrationPort,
  ageDdlOutsideMigration,
] as const

export const byName = (name: string): Guardrail | undefined => ALL.find((g) => g.name === name)

export { ageDdlOutsideMigration, crossAppImport, envFile, migrationPort, secretLeak }
