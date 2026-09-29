import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { ResolveGoogleDrivePhotosProgressEvent } from '../../resolvers/resolve-google-drive-photos'
import type { PhotoUploadCacheSchema } from '../../schema/photo-upload-cache-schema'
import type { ResolvedMapConfig } from '../../types/resolved-map-config'

import { preparePhotoForGoogleDrive } from '../../resolvers/prepare-photo-for-google-drive'
import { resolveGoogleDrivePhotos } from '../../resolvers/resolve-google-drive-photos'
import { createTemporaryDirectory } from '../helpers/create-temporary-directory'
import { createJsonResponse } from '../helpers/create-json-response'
import { getFetchCallUrl } from '../helpers/get-fetch-call-url'
import { createTestImage } from '../helpers/create-test-image'

let fetchMock = vi.fn<typeof fetch>()
let originalFetch = fetch

let googleDriveConfig = {
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token',
  clientId: 'client-id',
}

let googleDriveConfigWithFolder = {
  ...googleDriveConfig,
  folderId: 'folder-id',
}

async function createLocalPhotoFixture(): Promise<{
  photoBuffer: Buffer
  cachePath: string
  photoPath: string
}> {
  let temporaryDirectory = await createTemporaryDirectory()
  let photoPath = join(temporaryDirectory, 'kyoto.jpg')

  return {
    cachePath: join(temporaryDirectory, 'photo-cache.json'),
    photoBuffer: await createLocalPhoto(photoPath),
    photoPath,
  }
}

function createKyotoStationConfig(photo: string): ResolvedMapConfig {
  return {
    pins: [
      {
        coords: [35.0116, 135.7681],
        title: 'Kyoto Station',
        id: 'kyoto-station',
        icon: 'shapes-pin',
        color: 'red-500',
        photo,
      },
    ],
    map: {
      title: 'Kyoto',
    },
    layers: [],
  }
}

function mockPhotoUploadResponses(fileId: string, publicUrl: string): void {
  fetchMock.mockResolvedValueOnce(
    createJsonResponse({
      id: fileId,
    }),
  )
  fetchMock.mockResolvedValueOnce(createJsonResponse({}))
  fetchMock.mockResolvedValueOnce(
    createJsonResponse({
      webContentLink: publicUrl,
    }),
  )
}

function mockReplacementUploadResponses(): void {
  mockAccessTokenResponse()
  fetchMock.mockResolvedValueOnce(
    createJsonResponse({
      files: [
        {
          id: 'map-folder-id',
        },
      ],
    }),
  )
  mockPhotoUploadResponses(
    'new-drive-file-id',
    'https://drive.example/new-kyoto.jpg',
  )
}

async function writePhotoUploadCache(
  cachePath: string,
  entries: PhotoUploadCacheSchema['entries'],
): Promise<void> {
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        version: 2,
        entries,
      },
      null,
      2,
    ),
    'utf8',
  )
}

async function createLocalPhoto(photoPath: string): Promise<Buffer> {
  let photoBuffer = await createTestImage().jpeg().toBuffer()

  await writeFile(photoPath, photoBuffer)

  return photoBuffer
}

function mockAccessTokenResponse(): void {
  fetchMock.mockResolvedValueOnce(
    createJsonResponse({
      // eslint-disable-next-line camelcase
      access_token: 'access-token',
    }),
  )
}

describe('resolveGoogleDrivePhotos', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns the config unchanged when no photos are present', async () => {
    let config = {
      pins: [
        {
          coords: [35.0116, 135.7681] as [number, number],
          icon: 'shapes-pin' as const,
          color: 'red-500' as const,
          title: 'Kyoto Station',
          id: 'kyoto-station',
        },
      ],
      map: {
        title: 'Kyoto',
      },
      layers: [],
    }

    await expect(resolveGoogleDrivePhotos(config)).resolves.toEqual(config)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws when local photo uploads are needed but Drive config is missing', async () => {
    let { cachePath, photoPath } = await createLocalPhotoFixture()

    await expect(
      resolveGoogleDrivePhotos(createKyotoStationConfig(photoPath), {
        cachePath,
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

  it('throws when a local photo file does not exist', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let cachePath = join(temporaryDirectory, 'photo-cache.json')

    await expect(
      resolveGoogleDrivePhotos(createKyotoStationConfig('/missing/kyoto.jpg'), {
        googleDriveConfig,
        cachePath,
      }),
    ).rejects.toMatchObject({
      name: 'LocalPhotoFileNotFoundError',
      photoPath: '/missing/kyoto.jpg',
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uploads local photos into Pinbook/{Map title}, caches their metadata, and rewrites them to public URLs', async () => {
    let { photoBuffer, cachePath, photoPath } = await createLocalPhotoFixture()
    let preparedPhoto = await preparePhotoForGoogleDrive({
      buffer: photoBuffer,
      photoPath,
    })

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
        id: 'kyoto-folder-id',
      }),
    )
    mockPhotoUploadResponses('drive-file-id', 'https://drive.example/kyoto.jpg')

    await expect(
      resolveGoogleDrivePhotos(
        {
          pins: [
            {
              coords: [35.0116, 135.7681],
              title: 'Kyoto Station',
              id: 'kyoto-station',
              icon: 'shapes-pin',
              photo: photoPath,
              color: 'red-500',
            },
            {
              photo: ['https://example.com/already-public.jpg', photoPath],
              coords: [35.0116, 135.7681],
              title: 'Kyoto Tower',
              icon: 'shapes-pin',
              id: 'kyoto-tower',
              color: 'red-500',
            },
            {
              coords: [34.6937, 135.5023],
              title: 'Osaka Station',
              id: 'osaka-station',
              icon: 'shapes-pin',
              color: 'red-500',
            },
          ],
          map: {
            title: 'Kyoto',
          },
          layers: [],
        },
        {
          googleDriveConfig,
          cachePath,
        },
      ),
    ).resolves.toEqual({
      pins: [
        {
          photo: 'https://drive.example/kyoto.jpg',
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
        {
          photo: [
            'https://example.com/already-public.jpg',
            'https://drive.example/kyoto.jpg',
          ],
          coords: [35.0116, 135.7681],
          title: 'Kyoto Tower',
          icon: 'shapes-pin',
          id: 'kyoto-tower',
          color: 'red-500',
        },
        {
          coords: [34.6937, 135.5023],
          title: 'Osaka Station',
          id: 'osaka-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
      map: {
        title: 'Kyoto',
      },
      layers: [],
    })

    expect(fetchMock).toHaveBeenCalledTimes(8)

    let rootFolderLookupRequestUrl = getFetchCallUrl(fetchMock, 1)

    expect(rootFolderLookupRequestUrl.searchParams.get('q')).toBe(
      "mimeType = 'application/vnd.google-apps.folder' and name = 'Pinbook' and 'root' in parents and trashed = false",
    )

    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      body: JSON.stringify({
        mimeType: 'application/vnd.google-apps.folder',
        name: 'Pinbook',
      }),
      method: 'POST',
    })

    let mapFolderLookupRequestUrl = getFetchCallUrl(fetchMock, 3)

    expect(mapFolderLookupRequestUrl.searchParams.get('q')).toBe(
      "mimeType = 'application/vnd.google-apps.folder' and name = 'Kyoto' and 'pinbook-folder-id' in parents and trashed = false",
    )

    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({
      body: JSON.stringify({
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['pinbook-folder-id'],
        name: 'Kyoto',
      }),
      method: 'POST',
    })

    let uploadRequest = fetchMock.mock.calls[5]?.[1]

    expect(uploadRequest).toMatchObject({
      headers: {
        Authorization: 'Bearer access-token',
      },
      method: 'POST',
    })

    let uploadBody = uploadRequest?.body

    expect(uploadBody).toBeInstanceOf(Blob)

    await expect((uploadBody as Blob).text()).resolves.toContain(
      '{"name":"kyoto.webp","parents":["kyoto-folder-id"]}',
    )

    await expect((uploadBody as Blob).text()).resolves.toContain(
      'Content-Type: image/webp',
    )

    let cacheSource = await readFile(cachePath, 'utf8')

    expect(JSON.parse(cacheSource) as unknown).toEqual({
      entries: {
        [photoPath]: {
          publicUrl: 'https://drive.example/kyoto.jpg',
          hash: preparedPhoto.hash,
          fileId: 'drive-file-id',
        },
      },
      version: 2,
    })
  })

  it('uploads local photos into {configured folder}/{Map title} when GOOGLE_DRIVE_FOLDER_ID is set', async () => {
    let { cachePath, photoPath } = await createLocalPhotoFixture()

    mockAccessTokenResponse()
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
    mockPhotoUploadResponses('drive-file-id', 'https://drive.example/kyoto.jpg')

    await expect(
      resolveGoogleDrivePhotos(
        {
          pins: [
            {
              coords: [35.0116, 135.7681],
              id: 'kyoto-station',
              icon: 'shapes-pin',
              photo: photoPath,
              color: 'red-500',
              title: 'Kyoto',
            },
          ],
          map: {
            title: 'Kyoto 2026',
          },
          layers: [],
        },
        {
          googleDriveConfig: googleDriveConfigWithFolder,
          cachePath,
        },
      ),
    ).resolves.toMatchObject({
      pins: [
        {
          photo: 'https://drive.example/kyoto.jpg',
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledTimes(6)

    let mapFolderLookupRequestUrl = getFetchCallUrl(fetchMock, 1)

    expect(mapFolderLookupRequestUrl.searchParams.get('q')).toBe(
      "mimeType = 'application/vnd.google-apps.folder' and name = 'Kyoto 2026' and 'folder-id' in parents and trashed = false",
    )

    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      body: JSON.stringify({
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['folder-id'],
        name: 'Kyoto 2026',
      }),
      method: 'POST',
    })

    let uploadBody = fetchMock.mock.calls[3]?.[1]?.body

    expect(uploadBody).toBeInstanceOf(Blob)
    await expect((uploadBody as Blob).text()).resolves.toContain(
      '{"name":"kyoto.webp","parents":["map-folder-id"]}',
    )
  })

  it('reuses the cached public URL when the local photo hash is unchanged', async () => {
    let { photoBuffer, cachePath, photoPath } = await createLocalPhotoFixture()
    let preparedPhoto = await preparePhotoForGoogleDrive({
      buffer: photoBuffer,
      photoPath,
    })

    await writePhotoUploadCache(cachePath, {
      [photoPath]: {
        publicUrl: 'https://drive.example/kyoto.jpg',
        hash: preparedPhoto.hash,
      },
    })
    await expect(
      resolveGoogleDrivePhotos(createKyotoStationConfig(photoPath), {
        googleDriveConfig,
        cachePath,
      }),
    ).resolves.toEqual(
      createKyotoStationConfig('https://drive.example/kyoto.jpg'),
    )

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uploads a changed photo, updates the cache, and deletes the stale Drive file', async () => {
    let { photoBuffer, cachePath, photoPath } = await createLocalPhotoFixture()
    let preparedPhoto = await preparePhotoForGoogleDrive({
      buffer: photoBuffer,
      photoPath,
    })

    await writePhotoUploadCache(cachePath, {
      [photoPath]: {
        publicUrl: 'https://drive.example/old-kyoto.jpg',
        fileId: 'old-drive-file-id',
        hash: 'old-hash',
      },
    })

    mockReplacementUploadResponses()
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(
      resolveGoogleDrivePhotos(createKyotoStationConfig(photoPath), {
        googleDriveConfig: googleDriveConfigWithFolder,
        cachePath,
      }),
    ).resolves.toMatchObject({
      pins: [
        {
          photo: 'https://drive.example/new-kyoto.jpg',
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledTimes(6)
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://www.googleapis.com/drive/v3/files/old-drive-file-id?supportsAllDrives=true',
      {
        headers: {
          Authorization: 'Bearer access-token',
        },
        method: 'DELETE',
      },
    )
    let cacheSource = await readFile(cachePath, 'utf8')

    expect(JSON.parse(cacheSource) as unknown).toEqual({
      entries: {
        [photoPath]: {
          publicUrl: 'https://drive.example/new-kyoto.jpg',
          fileId: 'new-drive-file-id',
          hash: preparedPhoto.hash,
        },
      },
      version: 2,
    })
  })

  it('uploads a changed photo without deleting when the old cache entry has no file id', async () => {
    let { cachePath, photoPath } = await createLocalPhotoFixture()

    await writePhotoUploadCache(cachePath, {
      [photoPath]: {
        publicUrl: 'https://drive.example/old-kyoto.jpg',
        hash: 'old-hash',
      },
    })

    mockReplacementUploadResponses()

    await expect(
      resolveGoogleDrivePhotos(createKyotoStationConfig(photoPath), {
        googleDriveConfig: googleDriveConfigWithFolder,
        cachePath,
      }),
    ).resolves.toMatchObject({
      pins: [
        {
          photo: 'https://drive.example/new-kyoto.jpg',
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('warns and continues when stale Drive photo deletion fails', async () => {
    let { cachePath, photoPath } = await createLocalPhotoFixture()
    let onWarning = vi.fn<(message: string) => void>()

    await writePhotoUploadCache(cachePath, {
      [photoPath]: {
        publicUrl: 'https://drive.example/old-kyoto.jpg',
        fileId: 'old-drive-file-id',
        hash: 'old-hash',
      },
    })

    mockReplacementUploadResponses()
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          error: {
            message: 'delete failed',
          },
        },
        500,
      ),
    )

    await expect(
      resolveGoogleDrivePhotos(createKyotoStationConfig(photoPath), {
        googleDriveConfig: googleDriveConfigWithFolder,
        onWarning,
        cachePath,
      }),
    ).resolves.toMatchObject({
      pins: [
        {
          photo: 'https://drive.example/new-kyoto.jpg',
        },
      ],
    })

    expect(onWarning).toHaveBeenCalledWith(
      'Google Drive file deletion failed for "old-drive-file-id": delete failed',
    )
  })

  it('warns with a fallback message when stale Drive photo deletion throws a non-Error value', async () => {
    let { cachePath, photoPath } = await createLocalPhotoFixture()
    let onWarning = vi.fn<(message: string) => void>()

    await writePhotoUploadCache(cachePath, {
      [photoPath]: {
        publicUrl: 'https://drive.example/old-kyoto.jpg',
        fileId: 'old-drive-file-id',
        hash: 'old-hash',
      },
    })

    mockReplacementUploadResponses()
    fetchMock.mockRejectedValueOnce('delete failed')

    await expect(
      resolveGoogleDrivePhotos(createKyotoStationConfig(photoPath), {
        googleDriveConfig: googleDriveConfigWithFolder,
        onWarning,
        cachePath,
      }),
    ).resolves.toMatchObject({
      pins: [
        {
          photo: 'https://drive.example/new-kyoto.jpg',
        },
      ],
    })

    expect(onWarning).toHaveBeenCalledWith(
      'Google Drive file deletion failed for "old-drive-file-id".',
    )
  })

  it('emits progress updates while local photos are processed', async () => {
    let { photoBuffer, cachePath, photoPath } = await createLocalPhotoFixture()
    let preparedPhoto = await preparePhotoForGoogleDrive({
      buffer: photoBuffer,
      photoPath,
    })
    let onProgressSpy =
      vi.fn<(event: ResolveGoogleDrivePhotosProgressEvent) => void>()

    function onProgress(event: ResolveGoogleDrivePhotosProgressEvent): void {
      onProgressSpy(event)
    }

    await writePhotoUploadCache(cachePath, {
      [photoPath]: {
        publicUrl: 'https://drive.example/kyoto.jpg',
        hash: preparedPhoto.hash,
      },
    })

    await expect(
      resolveGoogleDrivePhotos(createKyotoStationConfig(photoPath), {
        googleDriveConfig,
        onProgress,
        cachePath,
      }),
    ).resolves.toMatchObject({
      pins: [
        {
          photo: 'https://drive.example/kyoto.jpg',
        },
      ],
    })

    expect(onProgressSpy).toHaveBeenNthCalledWith(1, {
      type: 'start',
      completed: 0,
      uploaded: 0,
      cached: 0,
      total: 1,
    })
    expect(onProgressSpy).toHaveBeenNthCalledWith(2, {
      type: 'cache-hit',
      completed: 1,
      uploaded: 0,
      photoPath,
      cached: 1,
      total: 1,
    })
    expect(onProgressSpy).toHaveBeenNthCalledWith(3, {
      type: 'complete',
      completed: 1,
      uploaded: 0,
      cached: 1,
      total: 1,
    })
  })

  it('reuses a single Drive upload context for multiple uncached photos', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let cachePath = join(temporaryDirectory, 'photo-cache.json')
    let firstPhotoPath = join(temporaryDirectory, 'kyoto.jpg')
    let secondPhotoPath = join(temporaryDirectory, 'osaka.jpg')
    let onProgressSpy =
      vi.fn<(event: ResolveGoogleDrivePhotosProgressEvent) => void>()
    let folderLookupCount = 0
    let folderCreateCount = 0
    let uploadCount = 0

    await createLocalPhoto(firstPhotoPath)
    await createLocalPhoto(secondPhotoPath)

    function onProgress(event: ResolveGoogleDrivePhotosProgressEvent): void {
      onProgressSpy(event)
    }

    fetchMock.mockImplementation(input => {
      let url: URL

      if (input instanceof Request) {
        url = new URL(input.url)
      } else if (input instanceof URL) {
        url = input
      } else {
        url = new URL(input)
      }

      if (url.pathname === '/token') {
        return Promise.resolve(
          createJsonResponse({
            // eslint-disable-next-line camelcase
            access_token: 'access-token',
          }),
        )
      }

      if (
        url.pathname === '/drive/v3/files' &&
        url.searchParams.get('fields') === 'files(id)'
      ) {
        folderLookupCount += 1

        return Promise.resolve(
          createJsonResponse({
            files: [],
          }),
        )
      }

      if (
        url.pathname === '/drive/v3/files' &&
        !url.searchParams.has('uploadType')
      ) {
        folderCreateCount += 1

        return Promise.resolve(
          createJsonResponse({
            id: 'map-folder-id',
          }),
        )
      }

      if (url.pathname === '/upload/drive/v3/files') {
        uploadCount += 1

        return Promise.resolve(
          createJsonResponse({
            id: `drive-file-id-${uploadCount}`,
          }),
        )
      }

      if (url.pathname.endsWith('/permissions')) {
        return Promise.resolve(createJsonResponse({}))
      }

      if (url.pathname.startsWith('/drive/v3/files/')) {
        let fileId = url.pathname.split('/').at(-1)

        return Promise.resolve(
          createJsonResponse({
            webContentLink: `https://drive.example/${fileId}.jpg`,
          }),
        )
      }

      throw new TypeError(`Unexpected fetch URL in test: ${url}`)
    })

    let resolvedConfig = await resolveGoogleDrivePhotos(
      {
        pins: [
          {
            coords: [35.0116, 135.7681],
            title: 'Kyoto Station',
            photo: firstPhotoPath,
            id: 'kyoto-station',
            icon: 'shapes-pin',
            color: 'red-500',
          },
          {
            coords: [34.6937, 135.5023],
            title: 'Osaka Station',
            photo: secondPhotoPath,
            id: 'osaka-station',
            icon: 'shapes-pin',
            color: 'red-500',
          },
        ],
        map: {
          title: 'Japan Trip',
        },
        layers: [],
      },
      {
        googleDriveConfig: googleDriveConfigWithFolder,
        onProgress,
        cachePath,
      },
    )

    expect(resolvedConfig.pins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          photo: 'https://drive.example/drive-file-id-1.jpg',
        }),
        expect.objectContaining({
          photo: 'https://drive.example/drive-file-id-2.jpg',
        }),
      ]),
    )

    expect(folderLookupCount).toBe(1)
    expect(folderCreateCount).toBe(1)
    expect(uploadCount).toBe(2)
    expect(
      onProgressSpy.mock.calls.filter(
        ([event]) => event.type === 'drive-auth-start',
      ),
    ).toHaveLength(1)
    expect(
      onProgressSpy.mock.calls.filter(
        ([event]) => event.type === 'drive-auth-complete',
      ),
    ).toHaveLength(1)
  })

  it('surfaces Google authentication failures', async () => {
    let { cachePath, photoPath } = await createLocalPhotoFixture()

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
      resolveGoogleDrivePhotos(createKyotoStationConfig(photoPath), {
        googleDriveConfig,
        cachePath,
      }),
    ).rejects.toMatchObject({
      message: 'Google Drive authentication failed: bad refresh token',
      name: 'GoogleDrivePhotoUploadError',
    })
  })
})
