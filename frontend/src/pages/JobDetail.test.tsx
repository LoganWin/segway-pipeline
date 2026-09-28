import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { components } from '@/api/schema'
import {
  fetchMock,
  json,
  makeJob,
  renderRoute,
  requestAt,
  requestLines,
} from '@/components/jobs/test-utils'
import { JobDetail } from './JobDetail'

type StatusEvent = components['schemas']['StatusEventResponse']

describe('JobDetail', () => {
  it('refetches the history after a status change', async () => {
    const user = userEvent.setup()
    const job = makeJob()
    const history: StatusEvent[] = [
      {
        id: 1,
        application_id: 3,
        from_status: null,
        to_status: 'saved',
        at: '2026-09-27T12:00:00Z',
        note: null,
      },
    ]
    fetchMock.mockImplementation(async (request) => {
      const path = new URL(request.url).pathname
      if (path === '/api/jobs/7') return json(job)
      if (path === '/api/applications/3/history') return json(history)
      if (path === '/api/applications/3/transition') {
        const { to_status, note } = (await request.clone().json()) as {
          to_status: 'applied'
          note: string | null
        }
        history.push({
          id: 2,
          application_id: 3,
          from_status: 'saved',
          to_status,
          at: '2026-09-27T13:00:00Z',
          note,
        })
        return json({
          ...job.application,
          status: to_status,
          allowed_transitions: ['interviewing', 'rejected', 'withdrawn'],
        })
      }
      return json({ detail: 'Not found' }, 404)
    })
    renderRoute(<JobDetail />, '/jobs/:id', '/jobs/7')

    const timeline = await screen.findByRole('list', { name: 'Status history' })
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(1)
    expect(within(timeline).getByText('Added as Saved')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('New status'), 'applied')
    await user.type(
      screen.getByRole('textbox', { name: 'Note (optional)' }),
      'Sent via site',
    )
    await user.click(screen.getByRole('button', { name: 'Update status' }))

    expect(
      await within(timeline).findByText('Saved → Applied'),
    ).toBeInTheDocument()
    expect(within(timeline).getByText('Sent via site')).toBeInTheDocument()
    const lines = requestLines()
    const post = lines.indexOf('POST /api/applications/3/transition')
    expect(post).toBeGreaterThan(-1)
    expect(lines.slice(post + 1)).toContain('GET /api/applications/3/history')
    expect(await requestAt(post).json()).toEqual({
      to_status: 'applied',
      note: 'Sent via site',
    })
  })
})
