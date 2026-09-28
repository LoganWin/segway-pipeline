import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from './api'

describe('toApiError', () => {
  it('splits a 422 into field and general messages', () => {
    const error = toApiError(422, {
      detail: [
        { loc: ['body', 'name'], msg: 'Field required', type: 'missing' },
        { loc: ['body'], msg: 'end_date must be after start_date', type: 'x' },
      ],
    })
    expect(error).toBeInstanceOf(ApiError)
    expect(error.fieldErrors).toEqual({ name: ['Field required'] })
    expect(error.message).toBe('end_date must be after start_date')
  })

  it.each([
    [{ detail: [{ loc: 'body', msg: 'x' }, { loc: ['body'], msg: 1 }, null] }],
    [{ detail: [] }],
    [{ detail: '' }],
    [{ detail: { msg: 'nested' } }],
    ['plain text'],
    [null],
  ])('falls back to a generic message for an unexpected body: %j', (body) => {
    const error = toApiError(422, body)
    expect(error.message).toBe('Request failed (HTTP 422).')
    expect(error.fieldErrors).toEqual({})
  })
})
