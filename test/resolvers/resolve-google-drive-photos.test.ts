import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { writeFile, readFile, mkdtemp, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { resolveGoogleDrivePhotos } from '../../resolvers/resolve-google-drive-photos'

let temporaryDirectories: string[] = []
let fetchMock = vi.fn<typeof fetch>()
let originalFetch = globalThis.fetch

/**
 * Returns a fetch call URL as a concrete `URL` instance.
 *
 * @param callIndex - Zero-based fetch call index.
 * @returns Parsed request URL.
 */
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

async function createTemporaryDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-drive-photo-'))

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('resolveGoogleDrivePhotos', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
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
    let temporaryDirectory = await createTemporaryDirectory()
    let photoPath = join(temporaryDirectory, 'kyoto.jpg')

    await writeFile(photoPath, 'kyoto-photo', 'utf8')

    await expect(
      resolveGoogleDrivePhotos({
        pins: [
          {
            coords: [35.0116, 135.7681],
            title: 'Kyoto Station',
            id: 'kyoto-station',
            icon: 'shapes-pin',
            photo: photoPath,
            color: 'red-500',
          },
        ],
        map: {
          title: 'Kyoto',
        },
        layers: [],
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

  it('throws when a local photo file does not exist', async () => {
    await expect(
      resolveGoogleDrivePhotos(
        {
          pins: [
            {
              photo: '/missing/kyoto.jpg',
              coords: [35.0116, 135.7681],
              title: 'Kyoto Station',
              id: 'kyoto-station',
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
          googleDriveConfig: {
            clientSecret: 'client-secret',
            refreshToken: 'refresh-token',
            clientId: 'client-id',
          },
        },
      ),
    ).rejects.toMatchObject({
      name: 'LocalPhotoFileNotFoundError',
      photoPath: '/missing/kyoto.jpg',
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uploads local photos into Pinbook/{Map title}, caches their metadata, and rewrites them to public URLs', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let cachePath = join(temporaryDirectory, 'photo-cache.json')
    let photoPath = join(temporaryDirectory, 'kyoto.jpg')

    await writeFile(photoPath, 'kyoto-photo', 'utf8')

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
          id: 'kyoto-folder-id',
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'drive-file-id',
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
          webContentLink: 'https://drive.example/kyoto.jpg',
        }),
        {
          status: 200,
        },
      ),
    )

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
          googleDriveConfig: {
            clientSecret: 'client-secret',
            refreshToken: 'refresh-token',
            clientId: 'client-id',
          },
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

    let rootFolderLookupRequestUrl = getFetchCallUrl(1)

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

    let mapFolderLookupRequestUrl = getFetchCallUrl(3)

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
      '{"name":"kyoto.jpg","parents":["kyoto-folder-id"]}',
    )

    await expect((uploadBody as Blob).text()).resolves.toContain(
      'Content-Type: image/jpeg\r\n\r\nkyoto-photo\r\n--',
    )

    await expect(
      readFile(cachePath, 'utf8').then(source => JSON.parse(source) as unknown),
    ).resolves.toEqual({
      entries: {
        [photoPath]: {
          hash: createHash('sha256').update('kyoto-photo').digest('hex'),
          publicUrl: 'https://drive.example/kyoto.jpg',
          fileId: 'drive-file-id',
        },
      },
      version: 1,
    })
  })

  it('uploads local photos into {configured folder}/{Map title} when GOOGLE_DRIVE_FOLDER_ID is set', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let photoPath = join(temporaryDirectory, 'kyoto.jpg')

    await writeFile(photoPath, 'kyoto-photo', 'utf8')

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
          id: 'map-folder-id',
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'drive-file-id',
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
          webContentLink: 'https://drive.example/kyoto.jpg',
        }),
        {
          status: 200,
        },
      ),
    )

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
          googleDriveConfig: {
            clientSecret: 'client-secret',
            refreshToken: 'refresh-token',
            clientId: 'client-id',
            folderId: 'folder-id',
          },
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

    let mapFolderLookupRequestUrl = getFetchCallUrl(1)

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
      '{"name":"kyoto.jpg","parents":["map-folder-id"]}',
    )
  })

  it('reuses the cached public URL when the local photo hash is unchanged', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let cachePath = join(temporaryDirectory, 'photo-cache.json')
    let photoPath = join(temporaryDirectory, 'kyoto.jpg')
    let photoBuffer = Buffer.from('kyoto-photo')

    await writeFile(photoPath, photoBuffer)
    await writeFile(
      cachePath,
      JSON.stringify(
        {
          entries: {
            [photoPath]: {
              hash: createHash('sha256').update(photoBuffer).digest('hex'),
              publicUrl: 'https://drive.example/kyoto.jpg',
              fileId: 'drive-file-id',
            },
          },
          version: 1,
        },
        null,
        2,
      ),
      'utf8',
    )
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
          ],
          map: {
            title: 'Kyoto',
          },
          layers: [],
        },
        {
          googleDriveConfig: {
            clientSecret: 'client-secret',
            refreshToken: 'refresh-token',
            clientId: 'client-id',
          },
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
      ],
      map: {
        title: 'Kyoto',
      },
      layers: [],
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces Google authentication failures', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let photoPath = join(temporaryDirectory, 'kyoto.jpg')

    await writeFile(photoPath, 'kyoto-photo', 'utf8')

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
          ],
          map: {
            title: 'Kyoto',
          },
          layers: [],
        },
        {
          googleDriveConfig: {
            clientSecret: 'client-secret',
            refreshToken: 'refresh-token',
            clientId: 'client-id',
          },
        },
      ),
    ).rejects.toMatchObject({
      message: 'Google Drive authentication failed: bad refresh token',
      name: 'GoogleDrivePhotoUploadError',
    })
  })
})
