import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
      },
    },
  })

/**
 * App-level providers for the Expo Router stack.
 *
 * Mirrors `apps/web/src/app/providers.tsx` — only the QueryClient is owned
 * here; the HeroUI Native + gesture providers stay in `_layout.tsx` because
 * Expo Router needs them at the navigation root.
 */
export function Providers({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
