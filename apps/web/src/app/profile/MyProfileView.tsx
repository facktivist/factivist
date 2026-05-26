'use client'

import { Profile } from '@factivist/ui-web/profile'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

import { ApiError, apiClient } from '../../lib/api/client.ts'

/**
 * No-op for `Profile.ComplaintList.onItemOpen`. The S1 web profile
 * page always passes an empty `items` list (authored-by filter on
 * `/complaints` is Phase 5 wave-4 work), so the callback never fires
 * in practice — keep it a single named symbol so coverage isn't
 * dragged down by an anonymous inline arrow.
 */
export const noopOpen = (_id: string): void => undefined

/**
 * Citizen-profile client island.
 *
 * Renders `Profile.Handle` + `Profile.Stats` + `Profile.ComplaintList`
 * when the visitor holds a citizen `factivist-session` cookie. On a 401
 * (cookie missing or expired) it falls back to the anonymous CTA.
 *
 * Citizens cannot be detected server-side without forwarding the
 * cookie through to the Hono API — keeping that in the client island
 * means the server-component (route) stays cookie-agnostic and the
 * operator path keeps its existing shape.
 *
 * Anonymity invariants per ADR-010:
 *   - The compound itself clamps `nullifierExcerpt` to the first 8
 *     chars; we re-clamp here as defence-in-depth.
 *   - The list is currently empty — server-side authored-by filter on
 *     `/complaints` is wave-4 work; the compound's empty hint copy is
 *     personalised with the citizen handle.
 */
export function MyProfileView() {
  const profileQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.getMyProfile(),
    retry: (_, err) => !(err instanceof ApiError && err.status === 401),
  })

  if (profileQuery.error instanceof ApiError && profileQuery.error.status === 401) {
    return (
      <div className="mt-4 space-y-3" data-testid="profile-anonymous">
        <p className="text-base text-muted-foreground">
          You are browsing anonymously. Factivist does not store your name, email, or any other
          identifier unless you choose to verify.
        </p>
        <p className="text-sm">
          <Link href="/" className="text-primary underline">
            Learn about the on-device verification flow →
          </Link>
        </p>
      </div>
    )
  }

  if (profileQuery.isLoading) {
    return (
      <p role="status" className="mt-4 text-sm text-muted-foreground" data-testid="profile-loading">
        Loading your profile…
      </p>
    )
  }

  const profile = profileQuery.data
  if (!profile) return null

  return (
    <div className="mt-4 flex flex-col gap-4" data-testid="profile-citizen">
      <Profile.Handle
        handle={profile.handle}
        nullifierExcerpt={profile.nullifierExcerpt.slice(0, 8)}
      />
      <Profile.Stats stats={profile.stats} />
      <Profile.ComplaintList
        handle={profile.handle}
        items={[]}
        loading={false}
        onItemOpen={noopOpen}
      />
    </div>
  )
}
