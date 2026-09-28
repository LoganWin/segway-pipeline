import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { paths } from '@/api/schema'
import { JobForm } from './JobForm'
import {
  firstRequest,
  json,
  makeJob,
  renderWithQuery,
  type FetchMock,
} from './test-utils'

// openapi-fetch captures `fetch` when the client is created, so the tests
// build the client with a mocked fetch and an absolute base URL.
const fetchMock: FetchMock = vi.hoisted(() => vi.fn())
vi.mock('@/api/client', async () => {
  const { default: createClient } = await import('openapi-fetch')
  return {
    api: createClient<paths>({ baseUrl: 'http://localhost', fetch: fetchMock }),
  }
})

describe('JobForm', () => {
  beforeEach(() => fetchMock.mockReset())

  it('requires a title and URL before sending anything', async () => {
    const user = userEvent.setup()
    renderWithQuery(<JobForm />)

    await user.click(screen.getByRole('button', { name: 'Add job' }))

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByText('Enter a job title.')).toBeInTheDocument()
    expect(screen.getByText('Enter the job posting URL.')).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Company' }),
    ).not.toHaveAttribute('aria-invalid')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the job with a pasted description and reports the saved job', async () => {
    const user = userEvent.setup()
    const saved = makeJob({ id: 12 })
    fetchMock.mockResolvedValue(json(saved, 201))
    const onSaved = vi.fn()
    renderWithQuery(<JobForm onSaved={onSaved} />)

    await user.type(
      screen.getByRole('textbox', { name: 'Title' }),
      '  Platform Engineer ',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'URL' }),
      'https://example.com/jobs/7',
    )
    await user.click(screen.getByRole('textbox', { name: 'Description' }))
    await user.paste('Build things.\nShip them.')
    await user.click(screen.getByRole('button', { name: 'Add job' }))

    expect(await screen.findByText('Job saved.')).toBeInTheDocument()
    expect(onSaved).toHaveBeenCalledWith(saved)
    const request = firstRequest(fetchMock)
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/api/jobs')
    expect(await request.json()).toEqual({
      title: 'Platform Engineer',
      url: 'https://example.com/jobs/7',
      company: '',
      location: null,
      description: 'Build things.\nShip them.',
      source: null,
      ats_type: null,
    })
  })

  it('puts edits to an existing job', async () => {
    const user = userEvent.setup()
    const job = makeJob({ source: 'referral' })
    fetchMock.mockResolvedValue(json({ ...job, location: 'Remote' }))
    renderWithQuery(<JobForm job={job} />)

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue(
      'Platform Engineer',
    )
    await user.type(screen.getByRole('textbox', { name: 'Location' }), 'Remote')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Job saved.')).toBeInTheDocument()
    const request = firstRequest(fetchMock)
    expect(request.method).toBe('PUT')
    expect(new URL(request.url).pathname).toBe('/api/jobs/7')
    expect(await request.json()).toMatchObject({
      location: 'Remote',
      source: 'referral',
    })
  })

  it('shows 422 validation messages from the API', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      json(
        {
          detail: [
            {
              loc: ['body', 'url'],
              msg: 'String should have at least 1 character',
              type: 'string_too_short',
            },
          ],
        },
        422,
      ),
    )
    renderWithQuery(<JobForm />)

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Engineer')
    await user.type(screen.getByRole('textbox', { name: 'URL' }), 'x')
    await user.click(screen.getByRole('button', { name: 'Add job' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'url: String should have at least 1 character',
    )
  })

  it('shows the detail of a 404 when the job is gone', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(json({ detail: 'Job 7 not found' }, 404))
    renderWithQuery(<JobForm job={makeJob()} />)

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Job 7 not found',
    )
  })
})
