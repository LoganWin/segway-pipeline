import { createFakeApi, fixtures, renderWithQueryClient } from './test-utils'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SkillsEditor } from './SkillsEditor'

describe('SkillsEditor', () => {
  it('shows the 409 detail for a duplicate skill and keeps the form open', async () => {
    const user = userEvent.setup()
    const api = createFakeApi({
      skills: [fixtures.skill({ id: 1, name: 'TypeScript' })],
    })
    renderWithQueryClient(<SkillsEditor />)
    await screen.findByRole('listitem', { name: 'Skill: TypeScript' })

    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    const form = screen.getByRole('form', { name: 'New skill' })
    await user.type(within(form).getByLabelText('Skill name'), 'TypeScript')
    await user.click(within(form).getByRole('button', { name: 'Create skill' }))

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      "Skill 'TypeScript' already exists",
    )
    expect(screen.getByRole('form', { name: 'New skill' })).toBeInTheDocument()
    expect(within(form).getByLabelText('Skill name')).toHaveValue('TypeScript')
    expect(api.writes()).toEqual([
      {
        method: 'POST',
        path: '/api/skills',
        body: { name: 'TypeScript', category: null, proficiency: null },
      },
    ])
    expect(api.state.skills).toHaveLength(1)
  })

  it('creates a skill with a unique name', async () => {
    const user = userEvent.setup()
    createFakeApi({ skills: [fixtures.skill({ id: 1, name: 'TypeScript' })] })
    renderWithQueryClient(<SkillsEditor />)
    await screen.findByRole('listitem', { name: 'Skill: TypeScript' })

    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    const form = screen.getByRole('form', { name: 'New skill' })
    await user.type(within(form).getByLabelText('Skill name'), 'SQL')
    await user.click(within(form).getByRole('button', { name: 'Create skill' }))

    expect(
      await screen.findByRole('listitem', { name: 'Skill: SQL' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('form', { name: 'New skill' }),
    ).not.toBeInTheDocument()
  })
})
