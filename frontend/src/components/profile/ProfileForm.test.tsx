import { createFakeApi, renderWithQueryClient } from './test-utils'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProfileForm } from './ProfileForm'

describe('ProfileForm', () => {
  it('shows an empty form when no profile exists (404), then saves it with PUT', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({ profile: null })
    renderWithQueryClient(<ProfileForm />)

    expect(
      await screen.findByText(/You haven't saved a profile yet/),
    ).toBeInTheDocument()
    expect(api.requests[0]).toMatchObject({
      method: 'GET',
      path: '/api/profile',
    })
    const form = screen.getByRole('form', { name: 'Profile' })
    expect(within(form).getByLabelText('Name')).toHaveValue('')
    expect(within(form).queryByRole('alert')).not.toBeInTheDocument()

    await user.type(within(form).getByLabelText('Name'), 'Ada Lovelace')
    await user.type(within(form).getByLabelText('Email'), 'ada@example.com')
    await user.type(within(form).getByLabelText('Phone'), '  ')
    await user.type(
      within(form).getByLabelText('Links (one per line)'),
      'https://example.com{enter}{enter} https://example.org ',
    )
    await user.click(within(form).getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Saved.')).toBeInTheDocument()
    expect(api.writes()).toEqual([
      {
        method: 'PUT',
        path: '/api/profile',
        body: {
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: null,
          location: null,
          links: ['https://example.com', 'https://example.org'],
          work_authorization: null,
        },
      },
    ])
    expect(
      screen.queryByText(/You haven't saved a profile yet/),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace')
  })
})
