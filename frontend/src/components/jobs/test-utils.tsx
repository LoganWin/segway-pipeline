import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { Job } from './queries'

export { fetchMock, json, requestAt, requestLines } from '@/test/api-mock'

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

/** Renders a page at `path`, matched against the route `pattern`. */
export function renderRoute(ui: ReactElement, pattern: string, path: string) {
  return renderWithQuery(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={ui} />
        <Route path="*" element={<p>Navigated away</p>} />
      </Routes>
    </MemoryRouter>,
  )
}
