/**
 * API client adapter.
 *
 * All calls go through the canonical Supabase custom-domain origin
 * (ADR-009 — India ISP mitigation). NEVER hard-code `*.supabase.co`.
 *
 * The base URL is read from `NEXT_PUBLIC_API_BASE_URL`; in dev it falls
 * back to the local Hono `apps/api` instance. Server Components can
 * override per-call via the `fetch` option (e.g. `next: { revalidate }`).
 *
 * Endpoint surface is derived from the Phase 1 ATID registry:
 *   - GET    /complaints            — discovery feed (q + filters + paging)
 *   - GET    /complaints/:id        — detail
 *   - POST   /complaints            — create
 *   - POST   /complaints/:id/flag   — flag-for-moderation
 *   - GET    /constituency/:level   — combobox dataset (states / districts / pcs / acs)
 *   - GET    /categories            — 35-row taxonomy
 */

import type {
  AuditEvent,
  CreateComplaintInput,
  DiscoveryFilters,
  FlagComplaintInput,
  GrievanceIntake,
  ModerationDecision,
  QueueItem,
} from '@factivist/shared/validators'
import { queueItemSchema } from '@factivist/shared/validators'

/** Public surface of a complaint as returned by the API. */
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

/**
 * Canonical base URL. ADR-009 — clients NEVER reference `*.supabase.co`.
 *
 * Public env var so Server + Client Components see the same value.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'

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

/**
 * Next.js extends `RequestInit` with a `next` property. We accept the
 * upstream type verbatim to stay forward-compatible with cache hints
 * like `revalidate: number | false` and `tags`.
 */
type NextRequestInit = RequestInit

const request = async <T>(path: string, init?: NextRequestInit): Promise<T> => {
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

/**
 * Build an `Authorization: Bearer <token>` header from the resolved
 * Supabase session. Returns `{}` when there is no token so callers can
 * spread unconditionally without leaking an empty `Authorization`.
 */
const bearerHeader = (token: string | null | undefined): HeadersInit =>
  token ? { Authorization: `Bearer ${token}` } : {}

// ─── Admin payload contracts ──────────────────────────────────────────
//
// These mirror the JSON envelopes returned by `apps/api/src/routes/admin/*`.
// Each list endpoint wraps rows in `{ items }` so the same shape works for
// future paging metadata (`{ items, page, pageSize, totalCount }`).

export interface ApiModerationQueuePage {
  readonly items: ReadonlyArray<QueueItem>
}

export interface ApiModerationDecisionResponse {
  readonly item: QueueItem
}

export interface ApiAuditLogEntry {
  readonly id: string
  readonly actor: string
  readonly action: AuditEvent['action']
  readonly targetKind: AuditEvent['targetKind']
  readonly targetId: string
  readonly payloadHash: string
  readonly rationale: string | null
  readonly ts: string
}

export interface ApiAuditLogPage {
  readonly items: ReadonlyArray<ApiAuditLogEntry>
  readonly page: number
  readonly pageSize: number
  readonly hasNext: boolean
}

export interface ApiGrievanceSummary {
  readonly id: string
  readonly complaintSlug: string
  readonly reason: QueueItem['reason']
  readonly status: QueueItem['status']
  readonly slaDueAt: string
  readonly createdAt: string
}

export interface ApiGrievancePage {
  readonly items: ReadonlyArray<ApiGrievanceSummary>
}

export interface AuditLogQuery {
  readonly from?: string
  readonly to?: string
  readonly actor?: string
  readonly action?: AuditEvent['action']
  readonly targetKind?: AuditEvent['targetKind']
  readonly page?: number
  readonly pageSize?: number
}

/**
 * Defensive boundary parse: the API explicitly omits citizen identifiers
 * (`nullifier`, `reporter_id`, IP, etc.), but if a regression adds one,
 * `queueItemSchema.parse()` will THROW on the unknown column — surfacing
 * the leak at the boundary rather than rendering it in the UI.
 *
 * Returns a structurally-cloned object so downstream `delete`s on an
 * unsanctioned field cannot mutate the API response.
 */
const sanitiseQueueItem = (raw: unknown): QueueItem => queueItemSchema.parse(raw)

export const apiClient = {
  // ─── Complaints ────────────────────────────────────────────────────
  listComplaints: (filters: DiscoveryFilters, init?: RequestInit) =>
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
      init,
    ),

  getComplaint: (id: string, init?: RequestInit) =>
    request<ApiComplaint>(`/complaints/${encodeURIComponent(id)}`, init),

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

  // ─── Constituency (combobox + breadcrumb dataset, ADR-017) ─────────
  /**
   * Returns nodes at the requested level. `parentCode` narrows the
   * dataset to children of a previously selected node and is required
   * for `district | pc | ac`.
   */
  listConstituency: (
    level: 'state' | 'district' | 'pc' | 'ac',
    parentCode?: string,
    init?: RequestInit,
  ) =>
    request<ReadonlyArray<ApiConstituencyNode>>(
      `/constituency/${level}?${buildSearchParams({ parent: parentCode }).toString()}`,
      init,
    ),

  /** Fuzzy search across the four-level dataset for the combobox. */
  searchConstituency: (query: string, init?: RequestInit) =>
    request<ReadonlyArray<ApiConstituencyNode>>(
      `/constituency/search?${buildSearchParams({ q: query }).toString()}`,
      init,
    ),

  // ─── Categories ────────────────────────────────────────────────────
  listCategories: (init?: RequestInit) => request<ReadonlyArray<ApiCategory>>('/categories', init),

  // ─── Admin: moderation queue (auth-gated by API middleware) ────────
  /**
   * Browse pending moderation cases. RBAC: admin OR moderator.
   *
   * Pass the Supabase session token explicitly; the web shell's server
   * components obtain it via `getServerSession()` and forward here.
   * Each row is run through `queueItemSchema` so a regression that adds
   * a citizen identifier to the API response fails closed at the
   * boundary rather than rendering in the operator UI (ADR-0010).
   */
  listModerationQueue: async (
    token: string | null,
    init?: RequestInit,
  ): Promise<ApiModerationQueuePage> => {
    const raw = await request<{ items: unknown[] }>('/admin/moderation', {
      ...init,
      headers: { ...bearerHeader(token), ...(init?.headers ?? {}) },
    })
    return { items: raw.items.map(sanitiseQueueItem) }
  },

  /**
   * Submit a decision. RBAC: admin only (moderators can browse, only
   * admins can decide per the backend route).
   *
   * The API responds with `409 case_not_pending` if the case has already
   * been decided — the form surfaces this as a non-destructive error.
   */
  decideModeration: async (
    token: string | null,
    id: string,
    decision: ModerationDecision,
  ): Promise<ApiModerationDecisionResponse> => {
    const raw = await request<{ item: unknown }>(
      `/admin/moderation/${encodeURIComponent(id)}/decide`,
      {
        method: 'POST',
        headers: bearerHeader(token),
        body: JSON.stringify(decision),
      },
    )
    return { item: sanitiseQueueItem(raw.item) }
  },

  /**
   * Browse the append-only audit log. RBAC: admin only.
   *
   * Backed by `GET /admin/audit-log` (wave 3 — see
   * `apps/api/src/routes/admin/audit.ts`). The handler enforces ts DESC
   * ordering + page/pageSize pagination + the documented filter set
   * (from / to / actor / action / targetKind). The response keys match
   * `ApiAuditLogPage` exactly.
   */
  listAuditLog: (
    token: string | null,
    query: AuditLogQuery = {},
    init?: RequestInit,
  ): Promise<ApiAuditLogPage> =>
    request<ApiAuditLogPage>(
      `/admin/audit-log?${buildSearchParams({
        from: query.from,
        to: query.to,
        actor: query.actor,
        action: query.action,
        targetKind: query.targetKind,
        page: query.page,
        pageSize: query.pageSize,
      }).toString()}`,
      { ...init, headers: { ...bearerHeader(token), ...(init?.headers ?? {}) } },
    ),

  /**
   * Browse open grievances. RBAC: admin only.
   *
   * Backed by `GET /admin/grievances` (wave 3 — see
   * `apps/api/src/routes/admin/grievances.ts`). Returns only the
   * operational metadata; complainant name + email live in the audit
   * log rationale per ADR-0014 + ADR-0016 minimisation.
   */
  listGrievances: (token: string | null, init?: RequestInit): Promise<ApiGrievancePage> =>
    request<ApiGrievancePage>('/admin/grievances', {
      ...init,
      headers: { ...bearerHeader(token), ...(init?.headers ?? {}) },
    }),

  /**
   * Public IT-Act grievance intake. No auth header required.
   */
  submitGrievance: (input: GrievanceIntake) =>
    request<{ readonly grievanceId: string; readonly slaDueAt: string }>('/grievance', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
} as const

export { ApiError }
