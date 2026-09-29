import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { getGoogleDriveUploadContext } from '../../resolvers/get-google-drive-upload-context'
import { createJsonResponse } from '../helpers/create-json-response'
import { getFetchCallUrl } from '../helpers/get-fetch-call-url'

let fetchMock = vi.fn<typeof fetch>()
let originalFetch = fetch

let googleDriveConfig = {
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
  clientId: 'client-id',
}

let googleDriveConfigWithParentFolder = {
  ...googleDriveConfig,
  folderId: 'parent-folder-id',
}

function mockAccessTokenResponse(): void {
  fetchMock.mockResolvedValueOnce(
    createJsonResponse({
      // eslint-disable-next-line camelcase
      access_token: 'access-token',
    }),
  )
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
      name: 'GoogleDriveConfigError',
    })
  })

  it('creates Pinbook/{Map title} in Drive root when no parent folder is configured', async () => {
    mockAccessTokenResponse()
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        files: [],
      }),
    )
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'pinbook-folder-id',
      }),
    )
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        files: [],
      }),
    )
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'map-folder-id',
      }),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        mapTitle: String.raw`Kyoto's \ Trip`,
        googleDriveConfig,
      }),
    ).resolves.toEqual({
      targetFolderId: 'map-folder-id',
      accessToken: 'access-token',
    })

    expect(getFetchCallUrl(fetchMock, 1).searchParams.get('q')).toBe(
      "mimeType = 'application/vnd.google-apps.folder' and name = 'Pinbook' and 'root' in parents and trashed = false",
    )
    expect(getFetchCallUrl(fetchMock, 3).searchParams.get('q')).toBe(
      String.raw`mimeType = 'application/vnd.google-apps.folder' and name = 'Kyoto\'s \\ Trip' and 'pinbook-folder-id' in parents and trashed = false`,
    )
  })

  it('reuses an existing map folder inside the configured parent folder', async () => {
    mockAccessTokenResponse()
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        files: [
          {
            id: 'existing-map-folder-id',
          },
        ],
      }),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: googleDriveConfigWithParentFolder,
        mapTitle: 'Japan',
      }),
    ).resolves.toEqual({
      targetFolderId: 'existing-map-folder-id',
      accessToken: 'access-token',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(getFetchCallUrl(fetchMock, 1).searchParams.get('q')).toBe(
      "mimeType = 'application/vnd.google-apps.folder' and name = 'Japan' and 'parent-folder-id' in parents and trashed = false",
    )
  })

  it('creates a missing map folder when folder lookup returns no files array', async () => {
    mockAccessTokenResponse()
    fetchMock.mockResolvedValueOnce(createJsonResponse({}))
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'map-folder-id',
      }),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: googleDriveConfigWithParentFolder,
        mapTitle: 'Japan',
      }),
    ).resolves.toEqual({
      targetFolderId: 'map-folder-id',
      accessToken: 'access-token',
    })
  })

  it('creates a missing map folder when folder lookup returns files without ids', async () => {
    mockAccessTokenResponse()
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        files: [{}],
      }),
    )
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'map-folder-id',
      }),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        googleDriveConfig: googleDriveConfigWithParentFolder,
        mapTitle: 'Japan',
      }),
    ).resolves.toEqual({
      targetFolderId: 'map-folder-id',
      accessToken: 'access-token',
    })
  })

  it('surfaces a Google auth error response', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          error: 'bad_refresh',
        },
        400,
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        mapTitle: 'Japan',
        googleDriveConfig,
      }),
    ).rejects.toThrow('Google Drive authentication failed: bad_refresh')
  })

  it('surfaces a folder lookup failure', async () => {
    mockAccessTokenResponse()
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          error: {
            message: 'lookup failed',
          },
        },
        500,
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        mapTitle: 'Japan',
        googleDriveConfig,
      }),
    ).rejects.toThrow(
      'Google Drive folder lookup failed for "Pinbook": lookup failed',
    )
  })

  it('surfaces folder creation failures and missing ids', async () => {
    mockAccessTokenResponse()
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        files: [],
      }),
    )
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          message: 'create failed',
        },
        500,
      ),
    )

    await expect(
      getGoogleDriveUploadContext(undefined, {
        mapTitle: 'Japan',
        googleDriveConfig,
      }),
    ).rejects.toThrow(
      'Google Drive folder creation failed for "Pinbook": create failed',
    )

    fetchMock.mockReset()
    mockAccessTokenResponse()
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        files: [],
      }),
    )
    fetchMock.mockResolvedValueOnce(createJsonResponse({}))

    await expect(
      getGoogleDriveUploadContext(undefined, {
        mapTitle: 'Japan',
        googleDriveConfig,
      }),
    ).rejects.toThrow(
      'Google Drive folder creation failed for "Pinbook": missing folder id in response.',
    )
  })
})
