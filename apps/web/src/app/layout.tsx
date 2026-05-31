import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { PrimaryNav } from '../components/PrimaryNav.tsx'

import { Providers } from './providers.tsx'
import './globals.css'

export const metadata: Metadata = {
  title: 'Factivist',
  description: 'Factivist web app',
}

/**
 * Root layout — mounts `<PrimaryNav />` once so the four-tab shell
 * (Home / Search / Compose / Profile, locked by ADR-0019) persists
 * across every route. The nav is a Client Component for active-link
 * styling; the layout itself stays a Server Component.
 *
 * `pb-16 md:pb-0` reserves space for the small-viewport bottom tab bar
 * so page content never sits under the nav.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <Providers>
          <PrimaryNav />
          <div className="pb-16 md:pb-0">{children}</div>
        </Providers>
      </body>
    </html>
  )
}
