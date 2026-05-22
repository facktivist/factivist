/**
 * Load and merge `.agent-acl.yaml` files into an `AclIndex`.
 *
 * Layer order:
 *   1. `<root>/.agent-acl.yaml`          — declares every agent identity
 *   2. `<root>/packages/<x>/.agent-acl.yaml` — additive package overlay
 *   3. `<root>/apps/<x>/.agent-acl.yaml`     — additive app overlay
 *
 * Overlays may ADD glob patterns to an agent's read/write/exec lists. They
 * cannot remove a previously-granted right — the only way to revoke is to
 * edit the root file, which surfaces as a single auditable diff.
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

import { parse as parseYaml } from 'yaml'

import type { AclFile, AclIndex, AclLayer } from './types.ts'

const ACL_FILENAME = '.agent-acl.yaml'

const readAclIfPresent = async (filePath: string, base: string): Promise<AclLayer | undefined> => {
  let body: string
  try {
    body = await readFile(filePath, 'utf8')
  } catch {
    return undefined
  }
  const parsed = parseYaml(body) as AclFile | undefined
  if (!parsed) {
    throw new Error(`agent-acl: ${filePath} is empty`)
  }
  if (parsed.version !== 1) {
    throw new Error(
      `agent-acl: ${filePath} declares unsupported version ${parsed.version} (expected 1)`,
    )
  }
  if (!parsed.agents || typeof parsed.agents !== 'object') {
    throw new Error(`agent-acl: ${filePath} is missing the required \`agents\` map`)
  }
  return { source: filePath, base, file: parsed }
}

const discoverOverlayDirs = async (root: string): Promise<string[]> => {
  const candidates: string[] = []
  for (const parent of ['packages', 'apps']) {
    const parentAbs = join(root, parent)
    let entries: string[]
    try {
      entries = await readdir(parentAbs)
    } catch {
      continue
    }
    for (const name of entries.sort()) {
      const dir = join(parentAbs, name)
      const s = await stat(dir).catch(() => undefined)
      if (s?.isDirectory()) candidates.push(dir)
    }
  }
  return candidates
}

/**
 * Walk the workspace, parse every ACL file found, and return a merged index.
 *
 * Throws if the root ACL is missing — we treat the absence of a root file as
 * misconfiguration rather than "no policy" because the safer default is to
 * fail closed.
 */
export const loadAcl = async (root: string): Promise<AclIndex> => {
  const rootLayer = await readAclIfPresent(join(root, ACL_FILENAME), '.')
  if (!rootLayer) {
    throw new Error(`agent-acl: missing root ${ACL_FILENAME} at ${root}`)
  }
  const layers: AclLayer[] = [rootLayer]
  for (const dir of await discoverOverlayDirs(root)) {
    const rel = relative(root, dir).split(sep).join('/')
    const overlay = await readAclIfPresent(join(dir, ACL_FILENAME), rel)
    if (overlay) layers.push(overlay)
  }
  const coordinator = layers
    .map((l) => l.file.coordinator)
    .filter((c): c is string => typeof c === 'string')
    .pop()
  return { layers, coordinator }
}
