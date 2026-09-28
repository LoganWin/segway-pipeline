import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { Mock } from 'vitest'
import type { Job } from './queries'

export type FetchMock = Mock<(request: Request) => Promise<Response>>

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

export function makeJob(overrides: Partial<Job> = {}): Job {
  const at = '2026-09-27T12:00:00Z'
  return {
    id: 7,
    title: 'Platform Engineer',
    url: 'https://example.com/jobs/7',
    company: 'Acme',
    description: '',
    source: null,
    location: null,
    ats_type: null,
    created_at: at,
    updated_at: at,
    ...overrides,
    application: {
      id: 3,
      job_id: 7,
      status: 'saved',
      resume_document_id: null,
      notes: null,
      created_at: at,
      updated_at: at,
      allowed_transitions: ['applied', 'preparing', 'rejected', 'withdrawn'],
      ...overrides.application,
    },
  }
}

export function firstRequest(fetchMock: FetchMock): Request {
  const call = fetchMock.mock.calls[0]
  if (!call) throw new Error('fetch was not called')
  return call[0]
}
