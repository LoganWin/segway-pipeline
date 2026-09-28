import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { JobForm } from './JobForm'
import {
  fetchMock,
  json,
  makeJob,
  renderWithQuery,
  requestAt,
} from './test-utils'

describe('JobForm', () => {
  it('requires a title before sending anything, but not a URL', async () => {
    const user = userEvent.setup()
    renderWithQuery(<JobForm />)

    await user.click(screen.getByRole('button', { name: 'Add job' }))

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByText('Enter a job title.')).toBeInTheDocument()
    for (const name of ['Company', 'URL']) {
      const field = screen.getByRole('textbox', { name })
      expect(field).not.toHaveAttribute('aria-invalid')
      expect(field).not.toBeRequired()
    }
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
    const request = requestAt()
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

  it('posts a job with only a title and an empty URL', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(json(makeJob({ url: '' }), 201))
    renderWithQuery(<JobForm />)

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add job' }))

    expect(await screen.findByText('Job saved.')).toBeInTheDocument()
    expect(await requestAt().json()).toMatchObject({
      title: 'Engineer',
      url: '',
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
    const request = requestAt()
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
              msg: 'Input should be a valid string',
              type: 'string_type',
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
      'url: Input should be a valid string',
    )
  })

  it('shows a generic message for an unexpected 422 body', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      json(
        { detail: [{ loc: 'body', msg: { text: 'odd' } }, 'oops', null] },
        422,
      ),
    )
    renderWithQuery(<JobForm />)

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Engineer')
    await user.click(screen.getByRole('button', { name: 'Add job' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Request failed (422). Please try again.',
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
