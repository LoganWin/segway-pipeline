import { createFakeApi, fixtures, renderWithQueryClient } from './test-utils'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BulletEditor } from './BulletEditor'

const skills = [
  fixtures.skill({ id: 1, name: 'TypeScript' }),
  fixtures.skill({ id: 2, name: 'SQL', category: 'Data' }),
  fixtures.skill({ id: 3, name: 'Kubernetes', category: 'Ops' }),
]

function findBullet(text: string) {
  return screen.findByRole('listitem', { name: `Bullet: ${text}` })
}

describe('BulletEditor', () => {
  it('shows an empty state when the experience has no bullets', async () => {
    createFakeApi({ skills })
    renderWithQueryClient(<BulletEditor experienceId={1} />)
    expect(await screen.findByText('No bullets yet.')).toBeInTheDocument()
  })

  it('lists bullets with their metrics, verified state and skills', async () => {
    createFakeApi({
      skills,
      bullets: [fixtures.bullet({ verified: true, skill_ids: [1, 2] })],
    })
    renderWithQueryClient(<BulletEditor experienceId={1} />)
    const bullet = await findBullet('Built a widget pipeline')
    expect(
      within(bullet).getByText('Metrics: cut build time 40%'),
    ).toBeInTheDocument()
    expect(
      within(bullet).getByRole('switch', { name: 'Verified' }),
    ).toBeChecked()
    expect(await within(bullet).findByText('TypeScript')).toBeInTheDocument()
    expect(within(bullet).getByText('SQL')).toBeInTheDocument()
    expect(within(bullet).queryByText('Kubernetes')).not.toBeInTheDocument()
  })

  it('toggles verified by sending the whole bullet, including its skills', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      skills,
      bullets: [fixtures.bullet({ verified: false, skill_ids: [1, 3] })],
    })
    renderWithQueryClient(<BulletEditor experienceId={1} />)
    const bullet = await findBullet('Built a widget pipeline')
    const toggle = within(bullet).getByRole('switch', { name: 'Verified' })
    expect(toggle).not.toBeChecked()

    await user.click(toggle)

    await waitFor(() => expect(toggle).toBeChecked())
    expect(api.writes()).toEqual([
      {
        method: 'PUT',
        path: '/api/experiences/1/bullets/10',
        body: {
          text: 'Built a widget pipeline',
          metrics: 'cut build time 40%',
          verified: true,
          skill_ids: [1, 3],
        },
      },
    ])
    expect(api.state.bullets[0]?.skill_ids).toEqual([1, 3])

    await user.click(toggle)
    await waitFor(() => expect(toggle).not.toBeChecked())
    expect(api.writes()[1]?.body).toMatchObject({
      verified: false,
      skill_ids: [1, 3],
    })
  })

  it('adds a bullet tagged with skills from /api/skills', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({ skills })
    renderWithQueryClient(<BulletEditor experienceId={1} />)
    await screen.findByText('No bullets yet.')

    await user.click(screen.getByRole('button', { name: 'Add bullet' }))
    const form = screen.getByRole('form', { name: 'New bullet' })
    await user.type(
      within(form).getByLabelText('Bullet text'),
      'Migrated reports to SQL',
    )
    await user.click(await within(form).findByRole('checkbox', { name: 'SQL' }))
    await user.click(within(form).getByRole('checkbox', { name: 'TypeScript' }))
    await user.click(within(form).getByRole('checkbox', { name: 'Verified' }))
    await user.click(within(form).getByRole('button', { name: 'Add bullet' }))

    const bullet = await findBullet('Migrated reports to SQL')
    expect(within(bullet).getByText('SQL')).toBeInTheDocument()
    expect(within(bullet).getByText('TypeScript')).toBeInTheDocument()
    expect(
      within(bullet).getByRole('switch', { name: 'Verified' }),
    ).toBeChecked()
    expect(api.writes()).toEqual([
      {
        method: 'POST',
        path: '/api/experiences/1/bullets',
        body: {
          text: 'Migrated reports to SQL',
          metrics: null,
          verified: true,
          skill_ids: [2, 1],
        },
      },
    ])
  })

  it('edits a bullet and changes its skill tags', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      skills,
      bullets: [fixtures.bullet({ verified: true, skill_ids: [1, 2] })],
    })
    renderWithQueryClient(<BulletEditor experienceId={1} />)
    const bullet = await findBullet('Built a widget pipeline')

    await user.click(within(bullet).getByRole('button', { name: 'Edit' }))
    const form = screen.getByRole('form', { name: 'Edit bullet' })
    expect(
      within(form).getByRole('checkbox', { name: 'TypeScript' }),
    ).toBeChecked()
    expect(within(form).getByRole('checkbox', { name: 'SQL' })).toBeChecked()
    expect(
      within(form).getByRole('checkbox', { name: 'Verified' }),
    ).toBeChecked()

    const text = within(form).getByLabelText('Bullet text')
    await user.clear(text)
    await user.type(text, 'Built a widget pipeline on Kubernetes')
    await user.clear(within(form).getByLabelText('Metrics'))
    await user.click(within(form).getByRole('checkbox', { name: 'SQL' }))
    await user.click(within(form).getByRole('checkbox', { name: 'Kubernetes' }))
    await user.click(within(form).getByRole('button', { name: 'Save bullet' }))

    const updated = await findBullet('Built a widget pipeline on Kubernetes')
    expect(within(updated).getByText('Kubernetes')).toBeInTheDocument()
    expect(within(updated).queryByText('SQL')).not.toBeInTheDocument()
    expect(api.writes()).toEqual([
      {
        method: 'PUT',
        path: '/api/experiences/1/bullets/10',
        body: {
          text: 'Built a widget pipeline on Kubernetes',
          metrics: null,
          verified: true,
          skill_ids: [1, 3],
        },
      },
    ])
  })

  it('deletes a bullet after confirmation', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({ skills, bullets: [fixtures.bullet()] })
    renderWithQueryClient(<BulletEditor experienceId={1} />)
    const bullet = await findBullet('Built a widget pipeline')

    await user.click(
      within(bullet).getByRole('button', { name: 'Delete bullet' }),
    )
    await user.click(
      within(bullet).getByRole('button', { name: 'Confirm delete' }),
    )

    expect(await screen.findByText('No bullets yet.')).toBeInTheDocument()
    expect(api.writes()).toEqual([
      {
        method: 'DELETE',
        path: '/api/experiences/1/bullets/10',
        body: undefined,
      },
    ])
  })

  it('shows unknown skill ids from a 422 under the skill picker', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({ skills })
    api.failNext('POST', '/api/experiences/1/bullets', 422, {
      detail: [
        {
          loc: ['body', 'skill_ids'],
          msg: 'Unknown skill ids: [2]',
          type: 'value_error',
        },
      ],
    })
    renderWithQueryClient(<BulletEditor experienceId={1} />)
    await screen.findByText('No bullets yet.')

    await user.click(screen.getByRole('button', { name: 'Add bullet' }))
    const form = screen.getByRole('form', { name: 'New bullet' })
    await user.type(within(form).getByLabelText('Bullet text'), 'Wrote docs')
    await user.click(await within(form).findByRole('checkbox', { name: 'SQL' }))
    await user.click(within(form).getByRole('button', { name: 'Add bullet' }))

    const skillGroup = within(form).getByRole('group', { name: 'Skills' })
    expect(
      await within(skillGroup).findByText('Unknown skill ids: [2]'),
    ).toBeInTheDocument()
    expect(within(form).getByLabelText('Bullet text')).toHaveValue('Wrote docs')
  })

  it('shows the error detail when a verified toggle fails', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({ skills, bullets: [fixtures.bullet()] })
    api.failNext('PUT', '/api/experiences/1/bullets/10', 404, {
      detail: 'Bullet 10 not found',
    })
    renderWithQueryClient(<BulletEditor experienceId={1} />)
    const bullet = await findBullet('Built a widget pipeline')

    await user.click(within(bullet).getByRole('switch', { name: 'Verified' }))

    expect(
      await within(bullet).findByText('Bullet 10 not found'),
    ).toBeInTheDocument()
    expect(
      within(bullet).getByRole('switch', { name: 'Verified' }),
    ).not.toBeChecked()
  })
})
