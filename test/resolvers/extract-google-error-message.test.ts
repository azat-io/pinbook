import { describe, expect, it } from 'vitest'

import { extractGoogleErrorMessage } from '../../resolvers/extract-google-error-message'

describe('extractGoogleErrorMessage', () => {
  it('prefers a nested Google API error message', () => {
    expect(
      extractGoogleErrorMessage({
        error: {
          message: 'nested message',
        },
      }),
    ).toBe('nested message')
  })

  it('falls back to error_description, message, error, and Unknown error', () => {
    expect(
      extractGoogleErrorMessage({
        // eslint-disable-next-line camelcase
        error_description: 'description message',
      }),
    ).toBe('description message')

    expect(
      extractGoogleErrorMessage({
        message: 'plain message',
      }),
    ).toBe('plain message')

    expect(
      extractGoogleErrorMessage({
        error: 'string error',
      }),
    ).toBe('string error')

    expect(extractGoogleErrorMessage({})).toBe('Unknown error.')
  })
})
