import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API_BASE_URL,
  type ApiAuditLogPage,
  type ApiCategory,
  type ApiComplaint,
  type ApiComplaintSummary,
  type ApiConstituencyNode,
  ApiError,
  type ApiGrievancePage,
  type ApiModerationDecisionResponse,
  type ApiModerationQueuePage,
  type ApiPage,
  apiClient,
  type CreateComplaintResponse,
} from '../client'

const mockJsonResponse = <T>(body: T, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as Response

const mockNoContent = (): Response =>
  ({
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
    text: () => Promise.resolve(''),
  }) as unknown as Response

const mockErrorJson = (status: number, body: unknown): Response =>
  ({
    ok: false,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as Response

const mockErrorNonJson = (status: number, text: string): Response =>
  ({
    ok: false,
    status,
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(text),
  }) as unknown as Response

const mockErrorTextThrows = (status: number): Response =>
  ({
    ok: false,
    status,
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.reject(new Error('socket')),
  }) as unknown as Response

const validQueueItem = {
  id: 'mq_11111111-1111-4111-8111-111111111111',
  complaintSlug: 'mh-pune-xyz',
  targetKind: 'complaint' as const,
  reason: 'pii-leak' as const,
  status: 'pending' as const,
  reviewerId: null,
  decidedAt: null,
  rationale: null,
  slaDueAt: '2026-06-01T00:00:00.000Z',
  createdAt: '2026-05-23T00:00:00.000Z',
  updatedAt: '2026-05-23T00:00:00.000Z',
}

describe('apps/web/src/lib/api/client', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('exposes API_BASE_URL', () => {
    expect(typeof API_BASE_URL).toBe('string')
    expect(API_BASE_URL.length).toBeGreaterThan(0)
  })

  describe('ApiError', () => {
    it('is an Error subclass with status + body', () => {
      const err = new ApiError('boom', 503, { code: 'down' })
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('ApiError')
      expect(err.message).toBe('boom')
      expect(err.status).toBe(503)
      expect(err.body).toEqual({ code: 'down' })
    })

    it('body is optional', () => {
      const err = new ApiError('x', 500)
      expect(err.body).toBeUndefined()
    })
  })

  describe('listComplaints', () => {
    it('serialises filters into the discovery query string', async () => {
      const page: ApiPage<ApiComplaintSummary> = {
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        hasNext: false,
      }
      fetchMock.mockResolvedValue(mockJsonResponse(page))
      await apiClient.listComplaints({
        q: 'water',
        stateCode: 'MH',
        districtCode: 'PUN',
        pcCode: 'PCMH-21',
        acCode: 'ACMH-203',
        categorySlug: 'infrastructure',
        sort: 'newest',
        page: 2,
        pageSize: 20,
      })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/complaints?')
      expect(url).toContain('q=water')
      expect(url).toContain('state=MH')
      expect(url).toContain('district=PUN')
      expect(url).toContain('pc=PCMH-21')
      expect(url).toContain('ac=ACMH-203')
      expect(url).toContain('category=infrastructure')
      expect(url).toContain('sort=newest')
      expect(url).toContain('page=2')
      expect(url).toContain('pageSize=20')
    })

    it('drops undefined / null / empty string filters', async () => {
      fetchMock.mockResolvedValue(
        mockJsonResponse({ items: [], page: 1, pageSize: 20, totalCount: 0, hasNext: false }),
      )
      await apiClient.listComplaints({ q: '', stateCode: undefined as never, sort: 'newest' })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).not.toContain('q=')
      expect(url).not.toContain('state=')
      expect(url).toContain('sort=newest')
    })
  })

  describe('getComplaint', () => {
    it('URL-encodes the slug', async () => {
      const c: ApiComplaint = {
        id: 'mh-pune-1',
        title: 't',
        body: 'b',
        bodyExcerpt: 'b',
        categorySlug: 'c',
        categoryLabel: 'c',
        stateCode: 'MH',
        districtCode: 'PUN',
        pcCode: '',
        acCode: '',
        stateLabel: '',
        districtLabel: '',
        pcLabel: '',
        acLabel: '',
        photoUrls: [],
        authorHandle: 'h',
        disclaimer: 'd',
        commentCount: 0,
        flagCount: 0,
        createdAt: '2026-05-23T00:00:00.000Z',
      }
      fetchMock.mockResolvedValue(mockJsonResponse(c))
      await apiClient.getComplaint('with spaces/and?weird')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/complaints/with%20spaces%2Fand%3Fweird')
    })
  })

  describe('createComplaint', () => {
    it('POSTs the body as JSON', async () => {
      const created: CreateComplaintResponse = {
        id: 'cmp_1',
        createdAt: '2026-05-23T00:00:00.000Z',
      }
      fetchMock.mockResolvedValue(mockJsonResponse(created, 201))
      const result = await apiClient.createComplaint({
        title: 't',
        body: 'b',
        categorySlug: 'infrastructure',
        stateCode: 'MH',
        districtCode: 'PUN',
        photoUrls: [],
        acceptedDisclaimer: true,
      } as never)
      expect(result.id).toBe('cmp_1')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      expect(init.body).toBeTypeOf('string')
      const parsed = JSON.parse(init.body as string)
      expect(parsed.title).toBe('t')
    })
  })

  describe('flagComplaint', () => {
    it('POSTs flag body and returns void on 204', async () => {
      fetchMock.mockResolvedValue(mockNoContent())
      const out = await apiClient.flagComplaint('mh-pune-1', {
        reason: 'pii-leak',
        body: 'visible Aadhaar',
      } as never)
      expect(out).toBeUndefined()
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
    })
  })

  describe('listComments', () => {
    it('GETs /comments with the complaint slug encoded into the query string', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({ items: [] }))
      const out = await apiClient.listComments('mh-pune-1')
      expect(out).toEqual({ items: [] })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/comments?complaint_slug=mh-pune-1')
    })
  })

  describe('createComment', () => {
    it('POSTs the input body to /comments and returns the created row', async () => {
      const created = {
        id: 'cmt_1',
        parentId: null,
        complaintId: 'mh-pune-1',
        authorHandle: 'anon_z',
        body: 'reply',
        createdAt: '2026-05-26T00:00:00.000Z',
        flagged: false,
      }
      fetchMock.mockResolvedValue(mockJsonResponse(created))
      const out = await apiClient.createComment({
        complaintSlug: 'mh-pune-1',
        body: 'reply',
        parentId: undefined,
      })
      expect(out).toEqual(created)
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      const parsed = JSON.parse(init.body as string)
      expect(parsed.complaintSlug).toBe('mh-pune-1')
    })
  })

  describe('listConstituency', () => {
    it('returns nodes and omits absent parent', async () => {
      const nodes: ApiConstituencyNode[] = [
        { code: 'MH', label: 'Maharashtra', parentCode: null, level: 'state' },
      ]
      fetchMock.mockResolvedValue(mockJsonResponse(nodes))
      const out = await apiClient.listConstituency('state')
      expect(out).toEqual(nodes)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/constituency/state?')
      expect(url).not.toContain('parent=')
    })

    it('passes parentCode when provided', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse([]))
      await apiClient.listConstituency('district', 'MH')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/constituency/district?parent=MH')
    })
  })

  describe('searchConstituency', () => {
    it('encodes the query', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse([]))
      await apiClient.searchConstituency('Pune City')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/constituency/search?q=Pune+City')
    })
  })

  describe('listCategories', () => {
    it('returns categories', async () => {
      const cats: ApiCategory[] = [{ slug: 'infrastructure', label: 'Infrastructure' }]
      fetchMock.mockResolvedValue(mockJsonResponse(cats))
      const out = await apiClient.listCategories()
      expect(out).toEqual(cats)
    })
  })

  describe('listModerationQueue', () => {
    it('sets the Bearer header and runs items through sanitiseQueueItem', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({ items: [validQueueItem] }))
      const page: ApiModerationQueuePage = await apiClient.listModerationQueue('tok-abc')
      expect(page.items).toHaveLength(1)
      expect(page.items[0].id).toBe('mq_11111111-1111-4111-8111-111111111111')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer tok-abc')
      // Wave-2 invariant: production requests carry the real Supabase
      // JWT, never the test-mode escape-hatch headers.
      const headerKeys = Object.keys(headers).map((k) => k.toLowerCase())
      expect(headerKeys).not.toContain('x-factivist-token')
      expect(headerKeys).not.toContain('x-factivist-role')
      expect(headerKeys).not.toContain('x-factivist-actor-id')
    })

    it('omits Authorization header when token is null', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({ items: [] }))
      await apiClient.listModerationQueue(null)
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
    })

    it('strips leaked nullifier/reporterId/aadhaar fields at the anonymity boundary', async () => {
      const leaky = { ...validQueueItem, nullifier: 'cit_leak', reporterId: 'r', aadhaar: '1234' }
      fetchMock.mockResolvedValue(mockJsonResponse({ items: [leaky] }))
      const page = await apiClient.listModerationQueue('tok')
      const item = page.items[0] as Record<string, unknown>
      expect(item.nullifier).toBeUndefined()
      expect(item.reporterId).toBeUndefined()
      expect(item.aadhaar).toBeUndefined()
      expect(item.id).toBe('mq_11111111-1111-4111-8111-111111111111')
    })
  })

  describe('decideModeration', () => {
    it('POSTs a decision and sanitises the returned item', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({ item: validQueueItem }))
      const decision = { decision: 'approve' as const, rationale: 'looks fine' }
      const out: ApiModerationDecisionResponse = await apiClient.decideModeration(
        'tok',
        'mq_11111111-1111-4111-8111-111111111111',
        decision,
      )
      expect(out.item.id).toBe('mq_11111111-1111-4111-8111-111111111111')
      const url = fetchMock.mock.calls[0][0] as string
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(url).toContain('/admin/moderation/mq_11111111-1111-4111-8111-111111111111/decide')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual(decision)
    })

    it('URL-encodes the id', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({ item: validQueueItem }))
      await apiClient.decideModeration('tok', 'with spaces', { decision: 'remove', rationale: 'r' })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/admin/moderation/with%20spaces/decide')
    })

    it('forwards Bearer token and NEVER emits x-factivist-token', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({ item: validQueueItem }))
      await apiClient.decideModeration('tok-dm', 'mq_11111111-1111-4111-8111-111111111111', {
        decision: 'approve',
        rationale: 'ok',
      })
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer tok-dm')
      // Anonymity / wave-2 invariant: the test-mode escape hatch header
      // MUST NEVER appear on a production request, regardless of casing.
      const headerKeys = Object.keys(headers).map((k) => k.toLowerCase())
      expect(headerKeys).not.toContain('x-factivist-token')
      expect(headerKeys).not.toContain('x-factivist-role')
      expect(headerKeys).not.toContain('x-factivist-actor-id')
    })
  })

  describe('listAuditLog', () => {
    it('serialises query params', async () => {
      const empty: ApiAuditLogPage = { items: [], page: 1, pageSize: 20, hasNext: false }
      fetchMock.mockResolvedValue(mockJsonResponse(empty))
      await apiClient.listAuditLog('tok', {
        from: '2026-01-01',
        to: '2026-02-01',
        actor: 'usr_x',
        action: 'moderation.decide',
        targetKind: 'complaint',
        page: 1,
        pageSize: 50,
      })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('from=2026-01-01')
      expect(url).toContain('to=2026-02-01')
      expect(url).toContain('actor=usr_x')
      expect(url).toContain('page=1')
      expect(url).toContain('pageSize=50')
    })

    it('defaults to empty query object', async () => {
      fetchMock.mockResolvedValue(
        mockJsonResponse({ items: [], page: 1, pageSize: 20, hasNext: false }),
      )
      await apiClient.listAuditLog('tok')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/admin/audit-log?')
    })

    it('forwards Bearer token and NEVER emits x-factivist-token', async () => {
      fetchMock.mockResolvedValue(
        mockJsonResponse({ items: [], page: 1, pageSize: 20, hasNext: false }),
      )
      await apiClient.listAuditLog('tok-al')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer tok-al')
      const headerKeys = Object.keys(headers).map((k) => k.toLowerCase())
      expect(headerKeys).not.toContain('x-factivist-token')
      expect(headerKeys).not.toContain('x-factivist-role')
      expect(headerKeys).not.toContain('x-factivist-actor-id')
    })

    it('omits Authorization header when token is null', async () => {
      fetchMock.mockResolvedValue(
        mockJsonResponse({ items: [], page: 1, pageSize: 20, hasNext: false }),
      )
      await apiClient.listAuditLog(null)
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
    })
  })

  describe('listGrievances', () => {
    it('forwards Bearer token', async () => {
      const page: ApiGrievancePage = { items: [] }
      fetchMock.mockResolvedValue(mockJsonResponse(page))
      await apiClient.listGrievances('tok-g')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer tok-g')
      const headerKeys = Object.keys(headers).map((k) => k.toLowerCase())
      expect(headerKeys).not.toContain('x-factivist-token')
      expect(headerKeys).not.toContain('x-factivist-role')
      expect(headerKeys).not.toContain('x-factivist-actor-id')
    })

    it('omits Authorization header when token is null', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({ items: [] }))
      await apiClient.listGrievances(null)
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
    })
  })

  describe('submitGrievance', () => {
    it('POSTs without an auth header', async () => {
      fetchMock.mockResolvedValue(
        mockJsonResponse({ grievanceId: 'gv_1', slaDueAt: '2026-05-24T00:00:00.000Z' }),
      )
      const result = await apiClient.submitGrievance({
        complainantName: 'A',
        complainantEmail: 'a@example.com',
        targetRef: 'mh-pune-1',
        reason: 'defamation',
        body: 'desc',
      } as never)
      expect(result.grievanceId).toBe('gv_1')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      const headers = init.headers as Record<string, string>
      expect(headers.Authorization).toBeUndefined()
    })
  })

  describe('request error handling', () => {
    it('throws ApiError with JSON body on !ok', async () => {
      fetchMock.mockResolvedValue(mockErrorJson(503, { code: 'down' }))
      await expect(apiClient.listCategories()).rejects.toMatchObject({
        name: 'ApiError',
        status: 503,
        body: { code: 'down' },
      })
    })

    it('falls back to text body when JSON parse fails', async () => {
      fetchMock.mockResolvedValue(mockErrorNonJson(500, 'server crashed'))
      try {
        await apiClient.listCategories()
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect((err as ApiError).body).toBe('server crashed')
      }
    })

    it('uses undefined body when both JSON and text fail', async () => {
      fetchMock.mockResolvedValue(mockErrorTextThrows(500))
      try {
        await apiClient.listCategories()
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect((err as ApiError).body).toBeUndefined()
      }
    })
  })
})
