/**
 * Mobile API client adapter.
 *
 * Mirrors `apps/web/src/lib/api/client.ts`. All calls hit the canonical
 * Supabase custom-domain origin (ADR-009) — never `*.supabase.co`. The
 * base URL is read from `EXPO_PUBLIC_API_BASE_URL` (Expo's public env
 * convention) and falls back to localhost for the iOS simulator.
 */

import type {
  CreateComplaintInput,
  DiscoveryFilters,
  FlagComplaintInput,
} from '@factivist/shared/validators'

export interface ApiComplaint {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly bodyExcerpt: string
  readonly categorySlug: string
  readonly categoryLabel: string
  readonly stateCode: string
  readonly districtCode: string
  readonly pcCode: string
  readonly acCode: string
  readonly stateLabel: string
  readonly districtLabel: string
  readonly pcLabel: string
  readonly acLabel: string
  readonly photoUrls: ReadonlyArray<string>
  readonly authorHandle: string
  readonly disclaimer: string
  readonly commentCount: number
  readonly flagCount: number
  readonly createdAt: string
}

export interface ApiComplaintSummary {
  readonly id: string
  readonly title: string
  readonly bodyExcerpt: string
  readonly categorySlug: string
  readonly categoryLabel: string
  readonly stateCode: string
  readonly districtCode: string
  readonly pcCode: string
  readonly acCode: string
  readonly photoUrls: ReadonlyArray<string>
  readonly authorHandle: string
  readonly commentCount: number
  readonly flagCount: number
  readonly createdAt: string
}

export interface ApiPage<T> {
  readonly items: ReadonlyArray<T>
  readonly page: number
  readonly pageSize: number
  readonly totalCount: number
  readonly hasNext: boolean
}

export interface ApiConstituencyNode {
  readonly code: string
  readonly label: string
  readonly parentCode: string | null
  readonly level: 'state' | 'district' | 'pc' | 'ac'
}

export interface ApiCategory {
  readonly slug: string
  readonly label: string
}

export interface CreateComplaintResponse {
  readonly id: string
  readonly createdAt: string
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const buildSearchParams = (input: Record<string, unknown>): URLSearchParams => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  return params
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text().catch(() => undefined)
    }
    throw new ApiError(`API ${res.status} on ${path}`, res.status, body)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const apiClient = {
  listComplaints: (filters: DiscoveryFilters) =>
    request<ApiPage<ApiComplaintSummary>>(
      `/complaints?${buildSearchParams({
        q: filters.q,
        state: filters.stateCode,
        district: filters.districtCode,
        pc: filters.pcCode,
        ac: filters.acCode,
        category: filters.categorySlug,
        sort: filters.sort,
        page: filters.page,
        pageSize: filters.pageSize,
      }).toString()}`,
    ),

  getComplaint: (id: string) => request<ApiComplaint>(`/complaints/${encodeURIComponent(id)}`),

  createComplaint: (input: CreateComplaintInput) =>
    request<CreateComplaintResponse>('/complaints', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  flagComplaint: (id: string, input: FlagComplaintInput) =>
    request<void>(`/complaints/${encodeURIComponent(id)}/flag`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listConstituency: (level: 'state' | 'district' | 'pc' | 'ac', parentCode?: string) =>
    request<ReadonlyArray<ApiConstituencyNode>>(
      `/constituency/${level}?${buildSearchParams({ parent: parentCode }).toString()}`,
    ),

  searchConstituency: (query: string) =>
    request<ReadonlyArray<ApiConstituencyNode>>(
      `/constituency/search?${buildSearchParams({ q: query }).toString()}`,
    ),

  listCategories: () => request<ReadonlyArray<ApiCategory>>('/categories'),
} as const

export { ApiError }
