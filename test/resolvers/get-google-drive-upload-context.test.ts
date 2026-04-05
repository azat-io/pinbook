import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { getGoogleDriveUploadContext } from '../../resolvers/get-google-drive-upload-context'

let fetchMock = vi.fn<typeof fetch>()
let originalFetch = globalThis.fetch

function getFetchCallUrl(callIndex: number): URL {
  let input = fetchMock.mock.calls[callIndex]?.[0]

  if (input instanceof URL) {
    return input
  }

  if (input instanceof Request) {
    return new URL(input.url)
  }

  if (typeof input === 'string') {
    return new URL(input)
  }

  throw new TypeError(`Expected fetch call ${callIndex} to contain a URL.`)
}

describe('getGoogleDriveUploadContext', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns an existing in-flight context promise unchanged', async () => {
    let existingContextPromise = Promise.resolve({
      targetFolderId: 'target-folder-id',
      accessToken: 'access-token',
    })

    await expect(
      getGoogleDriveUploadContext(existingContextPromise, {
        googleDriveConfig: undefined,
        mapTitle: 'ignored',
      }),
    ).resolves.toEqual({
      targetFolderId: 'target-folder-id',
      accessToken: 'access-token',
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws when required Google Drive variables are missing', async () => {
    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: {},
        mapTitle: 'Japan',
      }),
    ).rejects.toMatchObject({
      missingVariables: [
        'GOOGLE_DRIVE_CLIENT_ID',
        'GOOGLE_DRIVE_CLIENT_SECRET',
        'GOOGLE_DRIVE_REFRESH_TOKEN',
      ],
      name: 'GoogleDriveConfigurationError',
    })
  })

  it('creates Pinbook/{Map title} in Drive root when no parent folder is configured', async () => {
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
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          files: [],
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'pinbook-folder-id',
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          files: [],
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'map-folder-id',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: {
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          clientId: 'client-id',
        },
        mapTitle: String.raw`Kyoto's \ Trip`,
      }),
    ).resolves.toEqual({
      targetFolderId: 'map-folder-id',
      accessToken: 'access-token',
    })

    expect(getFetchCallUrl(1).searchParams.get('q')).toBe(
      "mimeType = 'application/vnd.google-apps.folder' and name = 'Pinbook' and 'root' in parents and trashed = false",
    )
    expect(getFetchCallUrl(3).searchParams.get('q')).toBe(
      String.raw`mimeType = 'application/vnd.google-apps.folder' and name = 'Kyoto\'s \\ Trip' and 'pinbook-folder-id' in parents and trashed = false`,
    )
  })

  it('reuses an existing map folder inside the configured parent folder', async () => {
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
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          files: [
            {
              id: 'existing-map-folder-id',
            },
          ],
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: {
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          folderId: 'parent-folder-id',
          clientId: 'client-id',
        },
        mapTitle: 'Japan',
      }),
    ).resolves.toEqual({
      targetFolderId: 'existing-map-folder-id',
      accessToken: 'access-token',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(getFetchCallUrl(1).searchParams.get('q')).toBe(
      "mimeType = 'application/vnd.google-apps.folder' and name = 'Japan' and 'parent-folder-id' in parents and trashed = false",
    )
  })

  it('creates a missing map folder when folder lookup returns no files array', async () => {
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
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'map-folder-id',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: {
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          folderId: 'parent-folder-id',
          clientId: 'client-id',
        },
        mapTitle: 'Japan',
      }),
    ).resolves.toEqual({
      targetFolderId: 'map-folder-id',
      accessToken: 'access-token',
    })
  })

  it('creates a missing map folder when folder lookup returns files without ids', async () => {
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
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          files: [{}],
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'map-folder-id',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: {
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          folderId: 'parent-folder-id',
          clientId: 'client-id',
        },
        mapTitle: 'Japan',
      }),
    ).resolves.toEqual({
      targetFolderId: 'map-folder-id',
      accessToken: 'access-token',
    })
  })

  it('surfaces a Google auth error response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'bad_refresh',
        }),
        {
          status: 400,
        },
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: {
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          clientId: 'client-id',
        },
        mapTitle: 'Japan',
      }),
    ).rejects.toThrow('Google Drive authentication failed: bad_refresh')
  })

  it('surfaces a folder lookup failure', async () => {
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
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message: 'lookup failed',
          },
        }),
        {
          status: 500,
        },
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: {
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          clientId: 'client-id',
        },
        mapTitle: 'Japan',
      }),
    ).rejects.toThrow(
      'Google Drive folder lookup failed for "Pinbook": lookup failed',
    )
  })

  it('surfaces folder creation failures and missing ids', async () => {
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
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          files: [],
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'create failed',
        }),
        {
          status: 500,
        },
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: {
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          clientId: 'client-id',
        },
        mapTitle: 'Japan',
      }),
    ).rejects.toThrow(
      'Google Drive folder creation failed for "Pinbook": create failed',
    )

    fetchMock.mockReset()
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
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          files: [],
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: {
          clientSecret: 'client-secret',
          refreshToken: 'refresh-token',
          clientId: 'client-id',
        },
        mapTitle: 'Japan',
      }),
    ).rejects.toThrow(
      'Google Drive folder creation failed for "Pinbook": missing folder id in response.',
    )
  })
})
