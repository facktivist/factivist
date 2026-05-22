/**
 * On-disk fixture builder for the ACL loader tests.
 */

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface FixtureFile {
  path: string
  content: string
}

export const createFixtureRoot = async (files: FixtureFile[]): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'agent-acl-'))
  for (const file of files) {
    const target = join(root, file.path)
    const dir = target.split('/').slice(0, -1).join('/')
    await mkdir(dir, { recursive: true })
    await writeFile(target, file.content)
  }
  return root
}

export const rootAcl = (extra = ''): FixtureFile => ({
  path: '.agent-acl.yaml',
  content: `version: 1
coordinator: coordinator
agents:
  coordinator:
    read: "*"
    write: "*"
    exec: "*"
    deny: [".env"]
  web-agent:
    read:
      - "apps/web/**"
      - "packages/shared/**"
    write:
      - "apps/web/**"
    exec:
      - "apps/web/**"
    deny: [".env"]
  reader:
    description: read-only auditor
    read: "*"
${extra}`,
})
