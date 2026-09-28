import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import type { paths } from '@/api/schema'
import { resetFetchMock } from './api-mock'

// Every test talks to a real openapi-fetch client whose `fetch` is the shared
// `fetchMock` (see api-mock.ts). The client is built inside the factory, so no
// test depends on import order.
vi.mock('@/api/client', async () => {
  const { default: createClient } = await import('openapi-fetch')
  const { fetchMock, TEST_BASE_URL } = await import('@/test/api-mock')
  return {
    api: createClient<paths>({
      baseUrl: TEST_BASE_URL,
      fetch: (request: Request) => fetchMock(request),
    }),
  }
})

// Radix's Checkbox and Switch measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(resetFetchMock)
afterEach(cleanup)
