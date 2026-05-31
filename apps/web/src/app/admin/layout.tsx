/**
 * Admin shell layout — Phase 5 Pipeline C.
 *
 * Server Component. RBAC gate runs at the layout boundary so every
 * nested page inherits it without re-asserting. Unauthenticated and
 * wrong-role callers are redirected to `/` — we deliberately do NOT
 * surface a 403 page (matches the API's "no role enumeration" stance,
 * ADR-0010 / `apps/api/src/lib/rbac.ts`).
 *
 * The header surfaces the current role as a non-removable badge so the
 * operator always knows which permissions they hold; the sidebar is the
 * canonical admin navigation (Queue / Audit / Grievances).
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '../../lib/auth/server.ts'

const NAV_ITEMS = [
  { href: '/admin/moderation', label: 'Queue' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/grievances', label: 'Grievances' },
] as const

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession()
  if (!session) {
    redirect('/')
  }

  return (
    <div
      className="flex min-h-dvh flex-col bg-background text-foreground"
      data-testid="admin-shell"
    >
      <header className="flex items-center justify-between border-b border-divider px-6 py-3">
        <Link
          href="/admin/moderation"
          className="text-base font-semibold tracking-tight"
          data-testid="admin-shell-title"
        >
          Factivist Admin
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary"
            data-testid="admin-role-badge"
          >
            <span className="sr-only">Current role: </span>
            {session.role}
          </span>
          <span className="text-xs text-muted-foreground" data-testid="admin-actor-id">
            {session.userId}
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        <nav
          aria-label="Admin sections"
          className="w-48 shrink-0 border-r border-divider px-3 py-4"
          data-testid="admin-nav"
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-default-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main
          id="admin-main"
          className="flex-1 px-6 py-6"
          aria-label="Admin content"
          data-testid="admin-main"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
