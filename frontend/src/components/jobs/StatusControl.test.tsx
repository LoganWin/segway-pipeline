import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StatusControl } from './StatusControl'
import {
  fetchMock,
  json,
  makeJob,
  renderWithQuery,
  requestAt,
} from './test-utils'

describe('StatusControl', () => {
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
    const request = requestAt()
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
