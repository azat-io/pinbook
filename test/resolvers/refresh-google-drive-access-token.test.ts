import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { refreshGoogleDriveAccessToken } from '../../resolvers/refresh-google-drive-access-token'

let fetchMock = vi.fn<typeof fetch>()
let originalFetch = globalThis.fetch

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
      new Response(
        JSON.stringify({
          // eslint-disable-next-line camelcase
          access_token: 'access-token',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      refreshGoogleDriveAccessToken({
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
      }),
    ).resolves.toBe('access-token')
  })

  it('surfaces a Google auth error response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          // eslint-disable-next-line camelcase
          error_description: 'bad refresh token',
        }),
        {
          status: 400,
        },
      ),
    )

    await expect(
      refreshGoogleDriveAccessToken({
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
      }),
    ).rejects.toThrow('Google Drive authentication failed: bad refresh token')
  })

  it('throws when Google omits access_token from a successful response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{}', {
        status: 200,
      }),
    )

    await expect(
      refreshGoogleDriveAccessToken({
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
      }),
    ).rejects.toThrow(
      'Google Drive authentication failed: missing access token in response.',
    )
  })
})
