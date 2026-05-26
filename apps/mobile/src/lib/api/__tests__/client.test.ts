import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL, ApiError, apiClient } from '../client'

const jsonOk = <T>(body: T, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as Response

const noContent = (): Response =>
  ({
    ok: true,
    status: 204,
    json: () => Promise.resolve(undefined),
    text: () => Promise.resolve(''),
  }) as unknown as Response

const errJson = (status: number, body: unknown): Response =>
  ({
    ok: false,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
  }) as unknown as Response

const errText = (status: number, text: string): Response =>
  ({
    ok: false,
    status,
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(text),
  }) as unknown as Response

const errBoth = (status: number): Response =>
  ({
    ok: false,
    status,
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.reject(new Error('socket')),
  }) as unknown as Response

describe('apps/mobile/src/lib/api/client', () => {
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
      fetchMock.mockResolvedValue(
        jsonOk({ items: [], page: 1, pageSize: 20, totalCount: 0, hasNext: false }),
      )
      await apiClient.listComplaints({
        q: 'water',
        stateCode: 'MH',
        districtCode: 'PUN',
        pcCode: 'PCMH-21',
        acCode: 'ACMH-203',
        categorySlug: 'infrastructure',
        sort: 'newest',
        page: 1,
        pageSize: 20,
      })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/complaints?')
      expect(url).toContain('q=water')
      expect(url).toContain('state=MH')
      expect(url).toContain('category=infrastructure')
    })

    it('skips empty / undefined filter values', async () => {
      fetchMock.mockResolvedValue(
        jsonOk({ items: [], page: 1, pageSize: 20, totalCount: 0, hasNext: false }),
      )
      await apiClient.listComplaints({ q: '', sort: 'newest' })
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).not.toContain('q=')
      expect(url).toContain('sort=newest')
    })
  })

  describe('getComplaint', () => {
    it('URL-encodes the id', async () => {
      fetchMock.mockResolvedValue(jsonOk({ id: 'x' }))
      await apiClient.getComplaint('with spaces?weird')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/complaints/with%20spaces%3Fweird')
    })
  })

  describe('createComplaint', () => {
    it('POSTs JSON body and returns server response', async () => {
      fetchMock.mockResolvedValue(
        jsonOk({ id: 'cmp_1', createdAt: '2026-05-23T00:00:00.000Z' }, 201),
      )
      const out = await apiClient.createComplaint({ title: 't', body: 'b' } as never)
      expect(out.id).toBe('cmp_1')
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({ title: 't', body: 'b' })
    })
  })

  describe('flagComplaint', () => {
    it('POSTs flag body and resolves undefined on 204', async () => {
      fetchMock.mockResolvedValue(noContent())
      const out = await apiClient.flagComplaint('mh-pune-1', {
        reason: 'pii-leak',
        body: 'leak',
      } as never)
      expect(out).toBeUndefined()
    })
  })

  describe('listConstituency', () => {
    it('omits parent when not provided', async () => {
      fetchMock.mockResolvedValue(jsonOk([]))
      await apiClient.listConstituency('state')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/constituency/state?')
      expect(url).not.toContain('parent=')
    })

    it('passes parentCode through', async () => {
      fetchMock.mockResolvedValue(jsonOk([]))
      await apiClient.listConstituency('district', 'MH')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('parent=MH')
    })
  })

  describe('searchConstituency', () => {
    it('encodes the query', async () => {
      fetchMock.mockResolvedValue(jsonOk([]))
      await apiClient.searchConstituency('Pune City')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('q=Pune+City')
    })
  })

  describe('listCategories', () => {
    it('returns category list', async () => {
      fetchMock.mockResolvedValue(jsonOk([{ slug: 'i', label: 'Infra' }]))
      const out = await apiClient.listCategories()
      expect(out[0].slug).toBe('i')
    })
  })

  describe('listComments', () => {
    it('GETs /comments with the encoded complaint slug', async () => {
      fetchMock.mockResolvedValue(jsonOk({ items: [] }))
      await apiClient.listComments('pothole MG/road')
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('/comments?complaint_slug=pothole%20MG%2Froad')
    })

    it('returns the wire shape verbatim', async () => {
      fetchMock.mockResolvedValue(
        jsonOk({
          items: [
            {
              id: 'cmt_1',
              parentId: null,
              complaintId: 'pothole',
              authorHandle: 'anon',
              body: 'hi',
              createdAt: '2026-05-22T08:00:00.000Z',
              flagged: false,
            },
          ],
        }),
      )
      const out = await apiClient.listComments('pothole')
      expect(out.items).toHaveLength(1)
      expect(out.items[0]?.id).toBe('cmt_1')
    })
  })

  describe('createComment', () => {
    it('POSTs the input as JSON to /comments', async () => {
      fetchMock.mockResolvedValue(
        jsonOk(
          {
            id: 'cmt_new',
            parentId: null,
            complaintId: 'pothole',
            authorHandle: 'anon',
            body: 'hi',
            createdAt: '2026-05-22T08:00:00.000Z',
            flagged: false,
          },
          201,
        ),
      )
      const out = await apiClient.createComment({ complaintSlug: 'pothole', body: 'hi' })
      expect(out.id).toBe('cmt_new')
      const url = fetchMock.mock.calls[0][0] as string
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(url).toContain('/comments')
      expect(init.method).toBe('POST')
      expect(JSON.parse(String(init.body))).toEqual({ complaintSlug: 'pothole', body: 'hi' })
    })

    it('forwards parentId when supplied', async () => {
      fetchMock.mockResolvedValue(
        jsonOk(
          {
            id: 'cmt_child',
            parentId: 'cmt_parent',
            complaintId: 'pothole',
            authorHandle: 'anon',
            body: 'reply',
            createdAt: '2026-05-22T08:00:00.000Z',
            flagged: false,
          },
          201,
        ),
      )
      await apiClient.createComment({
        complaintSlug: 'pothole',
        body: 'reply',
        parentId: 'cmt_parent',
      })
      const init = fetchMock.mock.calls[0][1] as RequestInit
      expect(JSON.parse(String(init.body))).toMatchObject({ parentId: 'cmt_parent' })
    })
  })

  describe('request error handling', () => {
    it('throws ApiError with JSON body on !ok', async () => {
      fetchMock.mockResolvedValue(errJson(503, { code: 'down' }))
      await expect(apiClient.listCategories()).rejects.toMatchObject({
        name: 'ApiError',
        status: 503,
        body: { code: 'down' },
      })
    })

    it('falls back to text body when JSON parse fails', async () => {
      fetchMock.mockResolvedValue(errText(500, 'crashed'))
      try {
        await apiClient.listCategories()
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect((err as ApiError).body).toBe('crashed')
      }
    })

    it('uses undefined body when both JSON and text fail', async () => {
      fetchMock.mockResolvedValue(errBoth(500))
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
