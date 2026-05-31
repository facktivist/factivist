/**
 * `Legal.*` compound — web (HeroUI v3).
 *
 * Surface 8 — Static legal pages + DPDP consent + IT Act grievance contact.
 *
 * Source of truth for copy lives in `apps/web/src/app/legal/`. This compound
 * only owns the shape; the actual ToS / Privacy / ZKP explainer content is
 * MDX/Markdown rendered into `children` by the host.
 *
 * Slots:
 *   `Legal.Page`             — static document wrapper with last-updated stamp
 *   `Legal.GrievanceContact` — IT Rules 2021 grievance officer card
 *   `Legal.ConsentBox`       — DPDP §6(4) per-purpose consent affordances
 */

import type * as React from 'react'

import { Card } from '../components/index.ts'
import type {
  LegalConsentBoxProps,
  LegalGrievanceContactProps,
  LegalPageProps,
} from './Legal.types.ts'

const cx = (...parts: ReadonlyArray<string | false | null | undefined>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')

const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Legal.Page ────────────────────────────────────────────────────────

const Page = ({
  kind,
  title,
  lastUpdated,
  children,
  className,
}: LegalPageProps): React.JSX.Element => (
  <article
    data-page-kind={kind}
    className={cx(
      'flex flex-col gap-4 p-6 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] prose-sm',
      className,
    )}
  >
    <header className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-3">
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{title}</h1>
      <p className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted-foreground)]">
        Last updated {fmtDate(lastUpdated)}
      </p>
    </header>
    <div className="text-sm text-[var(--color-foreground)] leading-relaxed">{children}</div>
  </article>
)

// ─── Legal.GrievanceContact ────────────────────────────────────────────

const GrievanceContact = ({
  officer,
  slaHours,
  className,
}: LegalGrievanceContactProps): React.JSX.Element => (
  <Card className={cx('p-6 flex flex-col gap-3', className)}>
    <header className="flex flex-col gap-0.5">
      <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted-foreground)]">
        IT Rules 2021 · Grievance officer
      </span>
      <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{officer.name}</h2>
      <p className="text-sm text-[var(--color-muted-foreground)]">{officer.designation}</p>
    </header>
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-[var(--color-muted-foreground)]">Email</dt>
      <dd>
        <a
          href={`mailto:${officer.email}`}
          className="text-[var(--color-primary)] underline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
        >
          {officer.email}
        </a>
      </dd>
      {officer.phone ? (
        <>
          <dt className="text-[var(--color-muted-foreground)]">Phone</dt>
          <dd className="text-[var(--color-foreground)] font-mono">{officer.phone}</dd>
        </>
      ) : null}
      <dt className="text-[var(--color-muted-foreground)]">Address</dt>
      <dd className="text-[var(--color-foreground)]">
        <address className="not-italic">
          {officer.addressLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
      </dd>
    </dl>
    <footer className="text-xs text-[var(--color-muted-foreground)]">
      Acknowledged within {slaHours} h of receipt per Rule 3(2)(a).
    </footer>
  </Card>
)

// ─── Legal.ConsentBox ──────────────────────────────────────────────────

const ConsentBox = ({
  purposes,
  value,
  onChange,
  className,
}: LegalConsentBoxProps): React.JSX.Element => {
  const setOne = (id: string, next: boolean): void => {
    onChange({ ...value, [id]: next })
  }
  return (
    <fieldset
      aria-label="Consent preferences"
      className={cx(
        'flex flex-col gap-3 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]',
        className,
      )}
    >
      <legend className="text-xs font-mono uppercase tracking-wider text-[var(--color-muted-foreground)]">
        DPDP §6(4) · Per-purpose consent
      </legend>
      {purposes.map((p) => {
        const checked = value[p.id] ?? p.required
        const inputId = `consent-${p.id}`
        return (
          <label key={p.id} htmlFor={inputId} className="flex items-start gap-3 cursor-pointer">
            <input
              id={inputId}
              type="checkbox"
              checked={checked}
              disabled={p.required}
              onChange={(e) => setOne(p.id, e.target.checked)}
              className="mt-0.5 accent-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-[var(--color-foreground)]">
                {p.label}
                {p.required ? (
                  <span className="ml-2 text-xs font-mono uppercase text-[var(--color-muted-foreground)]">
                    required
                  </span>
                ) : null}
              </span>
              <span className="text-xs text-[var(--color-muted-foreground)]">{p.description}</span>
            </div>
          </label>
        )
      })}
    </fieldset>
  )
}

export const Legal = { Page, GrievanceContact, ConsentBox } as const
export type LegalCompound = typeof Legal

export {
  ConsentBox as LegalConsentBox,
  GrievanceContact as LegalGrievanceContact,
  Page as LegalPage,
}
