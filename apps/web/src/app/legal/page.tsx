import Link from 'next/link'

import { LEGAL_PAGE_REGISTRY } from './registry.ts'

/**
 * `/legal` — index page.
 *
 * Lists the four static legal pages Factivist publishes for S1:
 * Terms of Service, Privacy Policy, ZKP Explainer, and the IT Rules
 * 2021 Grievance Officer contact card. Each entry routes through
 * `/legal/[kind]` which mounts the same `Legal.Page` compound with
 * page-specific copy.
 *
 * Surface 8 (axe baseline `08-legal` per ADR-021 — AAA opt-in via the
 * per-surface `extraTags`).
 */
export default function LegalIndexPage() {
  return (
    <main id="main" className="mx-auto flex max-w-2xl flex-col gap-4 p-6" data-testid="legal-index">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Legal</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Static legal pages, the IT Rules 2021 grievance contact, and consent affordances.
        </p>
      </header>
      <ul className="flex flex-col gap-2 list-none p-0">
        {LEGAL_PAGE_REGISTRY.map((entry) => (
          <li key={entry.kind}>
            <Link
              href={`/legal/${entry.kind}`}
              className="block rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:bg-[var(--color-muted)]"
            >
              <span className="text-base font-medium text-[var(--color-foreground)]">
                {entry.title}
              </span>
              <span className="block text-xs font-mono text-[var(--color-muted-foreground)]">
                Last updated {entry.lastUpdated.slice(0, 10)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
