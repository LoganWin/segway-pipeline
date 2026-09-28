/**
 * The shared API mock for component tests. `setup.ts` replaces `@/api/client`
 * with a real openapi-fetch client whose `fetch` calls `fetchMock`, so a test
 * stubs responses with `fetchMock.mockResolvedValue(json(...))` (or a fake API
 * via `mockImplementation`) and inspects the `Request`s it received.
 * `fetchMock` is reset before every test; unstubbed requests get a 501.
 */
import { vi } from 'vitest'

/** Absolute, because Node's `Request` rejects relative URLs such as `/api/...`. */
export const TEST_BASE_URL = 'http://localhost'

export const fetchMock = vi.fn<(request: Request) => Promise<Response>>()

export function json(body: unknown, status = 200): Response {
  if (status === 204) return new Response(null, { status })
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function resetFetchMock() {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (request) =>
    json(
      { detail: `No mock response for ${request.method} ${request.url}` },
      501,
    ),
  )
}

/** The `index`th request `fetchMock` received (the first by default). */
export function requestAt(index = 0): Request {
  const call = fetchMock.mock.calls[index]
  if (!call) throw new Error(`fetch was not called ${index + 1} time(s)`)
  return call[0]
}

/** Method and path (with query string) of every request so far, e.g. `GET /api/jobs?status=applied`. */
export function requestLines(): string[] {
  return fetchMock.mock.calls.map(([request]) => {
    const url = new URL(request.url)
    return `${request.method} ${url.pathname}${url.search}`
  })
}
