import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { refreshGoogleDriveAccessToken } from '../../resolvers/refresh-google-drive-access-token'
import { createJsonResponse } from '../helpers/create-json-response'

let fetchMock = vi.fn<typeof fetch>()
let originalFetch = fetch

let googleDriveConfig = {
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
  clientId: 'client-id',
}

describe('refreshGoogleDriveAccessToken', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns an access token when Google responds successfully', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        // eslint-disable-next-line camelcase
        access_token: 'access-token',
      }),
    )

    await expect(
      refreshGoogleDriveAccessToken(googleDriveConfig),
    ).resolves.toBe('access-token')
  })

  it('surfaces a Google auth error response', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          // eslint-disable-next-line camelcase
          error_description: 'bad refresh token',
        },
        400,
      ),
    )

    await expect(
      refreshGoogleDriveAccessToken(googleDriveConfig),
    ).rejects.toThrow('Google Drive authentication failed: bad refresh token')
  })

  it('throws when Google omits access_token from a successful response', async () => {
    fetchMock.mockResolvedValueOnce(createJsonResponse({}))

    await expect(
      refreshGoogleDriveAccessToken(googleDriveConfig),
    ).rejects.toThrow(
      'Google Drive authentication failed: missing access token in response.',
    )
  })
})
