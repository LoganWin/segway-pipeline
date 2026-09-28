import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  fetchMock,
  json,
  makeJob,
  renderRoute,
  requestLines,
} from '@/components/jobs/test-utils'
import { Dashboard } from './Dashboard'

const saved = makeJob({ id: 1, title: 'Saved role', company: 'Acme' })
const applied = makeJob({
  id: 2,
  title: 'Applied role',
  company: 'Globex',
  application: {
    ...makeJob().application,
    id: 4,
    job_id: 2,
    status: 'applied',
  },
})

describe('Dashboard', () => {
  it('sends the status filter to the API', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(async (request) => {
      const status = new URL(request.url).searchParams.get('status')
      return json(status === 'applied' ? [applied] : [saved, applied])
    })
    renderRoute(<Dashboard />, '/', '/')

    expect(
      await screen.findByRole('link', { name: 'Saved role' }),
    ).toBeInTheDocument()
    expect(requestLines()).toEqual(['GET /api/jobs'])

    await user.selectOptions(
      screen.getByLabelText('Filter by status'),
      'applied',
    )

    expect(
      await screen.findByRole('link', { name: 'Applied role' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Saved role' }),
    ).not.toBeInTheDocument()
    expect(requestLines()).toEqual([
      'GET /api/jobs',
      'GET /api/jobs?status=applied',
    ])
  })

  it('shows the filtered empty state', async () => {
    const user = userEvent.setup()
    fetchMock.mockImplementation(async (request) =>
      json(new URL(request.url).searchParams.has('status') ? [] : [saved]),
    )
    renderRoute(<Dashboard />, '/', '/')
    await screen.findByRole('link', { name: 'Saved role' })

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'offer')

    expect(
      await screen.findByRole('heading', { name: 'No jobs with this status' }),
    ).toBeInTheDocument()
    expect(requestLines()).toContain('GET /api/jobs?status=offer')
  })

  it('toggles the add-job panel with a stable label and aria-expanded', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(json([]))
    renderRoute(<Dashboard />, '/', '/')
    const toggle = screen.getByRole('button', { name: 'New job' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('form', { name: 'Add job' })).toBeNull()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('New job')
    const panel = document.getElementById(
      toggle.getAttribute('aria-controls') ?? '',
    )
    expect(panel).not.toBeNull()
    expect(
      within(panel!).getByRole('form', { name: 'Add job' }),
    ).toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('form', { name: 'Add job' })).toBeNull()
  })
})
