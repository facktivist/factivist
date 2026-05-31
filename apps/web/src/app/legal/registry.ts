/**
 * Static registry of legal page metadata.
 *
 * The registry is the single source of truth for the `/legal` index +
 * the `/legal/[kind]` dynamic route. Adding a new page is a two-step
 * change: add an entry here and add a copy block in `pageCopy.tsx`.
 *
 * The `kind` values must stay in lock-step with `LegalPageKind` in
 * `@factivist/ui-web/legal` — the compound uses the kind to attach
 * `data-page-kind` to the wrapping `<article>`, which the axe baseline
 * + Playwright a11y tests pin against.
 */

import type { LegalPageKind } from '@factivist/ui-web/legal'

export interface LegalPageEntry {
  readonly kind: LegalPageKind
  readonly title: string
  readonly lastUpdated: string
}

/**
 * Last-updated dates are intentionally locked to the commit that ships
 * the canonical copy — bump them when the copy materially changes.
 *
 * Counsel review of these texts is tracked in Phase 9 §3 of the S1
 * action plan; until that closes, the published copy is a draft and
 * MUST carry a "Draft — pending counsel sign-off" banner on the
 * rendered page (handled inside `pageCopy.tsx`).
 */
export const LEGAL_PAGE_REGISTRY: ReadonlyArray<LegalPageEntry> = [
  {
    kind: 'tos',
    title: 'Terms of Service',
    lastUpdated: '2026-05-26',
  },
  {
    kind: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: '2026-05-26',
  },
  {
    kind: 'zkp-explainer',
    title: 'How anonymous verification works',
    lastUpdated: '2026-05-26',
  },
  {
    kind: 'grievance',
    title: 'Grievance Officer — IT Rules 2021',
    lastUpdated: '2026-05-26',
  },
]

const KIND_SET = new Set<LegalPageKind>(LEGAL_PAGE_REGISTRY.map((e) => e.kind))

export const isLegalPageKind = (k: string): k is LegalPageKind => KIND_SET.has(k as LegalPageKind)

export const findLegalEntry = (k: string): LegalPageEntry | undefined =>
  LEGAL_PAGE_REGISTRY.find((e) => e.kind === k)
