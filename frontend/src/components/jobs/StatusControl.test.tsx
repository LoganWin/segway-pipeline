import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { paths } from '@/api/schema'
import { StatusControl } from './StatusControl'
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

describe('StatusControl', () => {
  beforeEach(() => fetchMock.mockReset())

  it('offers only the transitions the API allows', () => {
    const { application } = makeJob({
      application: {
        ...makeJob().application,
        status: 'interviewing',
        allowed_transitions: ['offer', 'rejected'],
      },
    })
    renderWithQuery(<StatusControl application={application} />)

    expect(screen.getByText('Interviewing')).toBeInTheDocument()
    const select = screen.getByLabelText('New status')
    const options = within(select)
      .getAllByRole('option')
      .filter((option) => !(option as HTMLOptionElement).disabled)
      .map((option) => option.textContent)
    expect(options).toEqual(['Offer', 'Rejected'])
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled()
  })

  it('shows no control for a closed application', () => {
    const { application } = makeJob({
      application: {
        ...makeJob().application,
        status: 'withdrawn',
        allowed_transitions: [],
      },
    })
    renderWithQuery(<StatusControl application={application} />)

    expect(screen.queryByLabelText('New status')).not.toBeInTheDocument()
    expect(screen.getByText(/no further status changes/)).toBeInTheDocument()
  })

  it('posts the transition with an optional note', async () => {
    const user = userEvent.setup()
    const { application } = makeJob()
    fetchMock.mockResolvedValue(
      json({ ...application, status: 'applied', allowed_transitions: [] }),
    )
    renderWithQuery(<StatusControl application={application} />)

    await user.selectOptions(screen.getByLabelText('New status'), 'applied')
    await user.type(
      screen.getByRole('textbox', { name: 'Note (optional)' }),
      'Sent via site',
    )
    await user.click(screen.getByRole('button', { name: 'Update status' }))

    expect(await screen.findByText('Status updated.')).toBeInTheDocument()
    const request = firstRequest(fetchMock)
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/api/applications/3/transition')
    expect(await request.json()).toEqual({
      to_status: 'applied',
      note: 'Sent via site',
    })
  })

  it('shows the detail of a 409 conflict', async () => {
    const user = userEvent.setup()
    const { application } = makeJob()
    fetchMock.mockResolvedValue(
      json(
        { detail: 'Cannot transition application from applied to preparing' },
        409,
      ),
    )
    renderWithQuery(<StatusControl application={application} />)

    await user.selectOptions(screen.getByLabelText('New status'), 'preparing')
    await user.click(screen.getByRole('button', { name: 'Update status' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot transition application from applied to preparing',
    )
  })
})
