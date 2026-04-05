import { describe, expect, it } from 'vitest'

import { toError } from '../../../commands/drive-auth/to-error'

describe('toError', () => {
  it('returns the original Error instance unchanged', () => {
    let error = new Error('boom')

    expect(toError(error)).toBe(error)
  })

  it('wraps unknown values into a normal Error instance', () => {
    expect(toError('boom')).toMatchObject({
      message: 'boom',
    })
  })
})
