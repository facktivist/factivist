import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Providers } from './providers.tsx'
import './globals.css'

export const metadata: Metadata = {
  title: 'Factivist',
  description: 'Factivist web app',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
