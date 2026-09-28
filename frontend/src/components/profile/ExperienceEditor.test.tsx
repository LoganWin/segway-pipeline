import { createFakeApi, fixtures, renderWithQueryClient } from './test-utils'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ExperienceEditor } from './ExperienceEditor'

describe('ExperienceEditor', () => {
  it('shows a loading state, then an empty state', async () => {
    createFakeApi()
    renderWithQueryClient(<ExperienceEditor />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading experiences')
    expect(await screen.findByText(/No experiences yet/)).toBeInTheDocument()
  })

  it('lists experiences with their bullets underneath', async () => {
    createFakeApi({
      experiences: [fixtures.experience()],
      bullets: [fixtures.bullet()],
      skills: [fixtures.skill()],
    })
    renderWithQueryClient(<ExperienceEditor />)
    const item = await screen.findByRole('article', {
      name: 'Software Engineer at Acme Widgets Inc.',
    })
    expect(within(item).getByText('Job')).toBeInTheDocument()
    expect(
      within(item).getByText('2022-01-01 – present · Springfield'),
    ).toBeInTheDocument()
    expect(
      await within(item).findByText('Built a widget pipeline'),
    ).toBeInTheDocument()
  })

  it('adds an experience', async () => {
    const user = userEvent.setup()
    const api = createFakeApi()
    renderWithQueryClient(<ExperienceEditor />)
    await screen.findByText(/No experiences yet/)

    await user.click(screen.getByRole('button', { name: 'Add experience' }))
    const form = screen.getByRole('form', { name: 'New experience' })
    await user.selectOptions(within(form).getByLabelText('Kind'), 'project')
    await user.type(within(form).getByLabelText('Organization'), 'Example Labs')
    await user.type(within(form).getByLabelText('Title'), 'Side project')
    await user.type(within(form).getByLabelText('Start date'), '2023-05-01')
    await user.click(
      within(form).getByRole('button', { name: 'Create experience' }),
    )

    expect(
      await screen.findByRole('article', {
        name: 'Side project at Example Labs',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('form', { name: 'New experience' }),
    ).not.toBeInTheDocument()
    expect(api.writes()).toEqual([
      {
        method: 'POST',
        path: '/api/experiences',
        body: {
          kind: 'project',
          org: 'Example Labs',
          title: 'Side project',
          start_date: '2023-05-01',
          end_date: null,
          location: null,
        },
      },
    ])
  })

  it('edits an experience with a full replacement', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({ experiences: [fixtures.experience()] })
    renderWithQueryClient(<ExperienceEditor />)
    const item = await screen.findByRole('article', {
      name: 'Software Engineer at Acme Widgets Inc.',
    })

    await user.click(within(item).getByRole('button', { name: 'Edit' }))
    const title = within(item).getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Senior Engineer')
    await user.type(within(item).getByLabelText('End date'), '2024-06-30')
    await user.click(
      within(item).getByRole('button', { name: 'Save experience' }),
    )

    expect(
      await screen.findByRole('article', {
        name: 'Senior Engineer at Acme Widgets Inc.',
      }),
    ).toBeInTheDocument()
    expect(api.writes()).toEqual([
      {
        method: 'PUT',
        path: '/api/experiences/1',
        body: {
          kind: 'job',
          org: 'Acme Widgets Inc.',
          title: 'Senior Engineer',
          start_date: '2022-01-01',
          end_date: '2024-06-30',
          location: 'Springfield',
        },
      },
    ])
  })

  it('deletes an experience after confirmation', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({ experiences: [fixtures.experience()] })
    renderWithQueryClient(<ExperienceEditor />)
    const item = await screen.findByRole('article', {
      name: 'Software Engineer at Acme Widgets Inc.',
    })

    await user.click(
      within(item).getByRole('button', { name: 'Delete experience' }),
    )
    expect(api.writes()).toEqual([])
    await user.click(
      within(item).getByRole('button', { name: 'Confirm delete' }),
    )

    expect(await screen.findByText(/No experiences yet/)).toBeInTheDocument()
    expect(api.writes()).toEqual([
      { method: 'DELETE', path: '/api/experiences/1', body: undefined },
    ])
  })

  it('shows 422 messages next to the fields they refer to', async () => {
    const user = userEvent.setup()
    const api = createFakeApi()
    api.failNext('POST', '/api/experiences', 422, {
      detail: [
        {
          loc: ['body', 'org'],
          msg: 'String should have at least 1 character',
          type: 'string_too_short',
        },
        {
          loc: ['body'],
          msg: 'Value error, end_date must not be before start_date',
          type: 'value_error',
        },
      ],
    })
    renderWithQueryClient(<ExperienceEditor />)
    await screen.findByText(/No experiences yet/)

    await user.click(screen.getByRole('button', { name: 'Add experience' }))
    const form = screen.getByRole('form', { name: 'New experience' })
    await user.type(within(form).getByLabelText('Organization'), ' x ')
    await user.type(within(form).getByLabelText('Title'), 'Engineer')
    await user.click(
      within(form).getByRole('button', { name: 'Create experience' }),
    )

    const org = within(form).getByLabelText('Organization')
    await waitFor(() => expect(org).toHaveAttribute('aria-invalid', 'true'))
    expect(org).toHaveAccessibleDescription(
      'String should have at least 1 character',
    )
    expect(within(form).getByLabelText('Title')).toHaveAttribute(
      'aria-invalid',
      'false',
    )
    expect(
      within(form).getByText(
        'Value error, end_date must not be before start_date',
      ),
    ).toBeInTheDocument()
  })

  it('shows the error detail when the list fails to load', async () => {
    const api = createFakeApi()
    api.failNext('GET', '/api/experiences', 500, {
      detail: 'Database unavailable',
    })
    renderWithQueryClient(<ExperienceEditor />)
    expect(await screen.findByText('Database unavailable')).toBeInTheDocument()
  })
})
