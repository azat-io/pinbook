import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { uploadPhotoToGoogleDrive } from '../../resolvers/upload-photo-to-google-drive'

let fetchMock = vi.fn<typeof fetch>()
let originalFetch = globalThis.fetch

describe('uploadPhotoToGoogleDrive', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('uploads a photo, publishes it, and returns its public URL', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'file-id',
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
      uploadPhotoToGoogleDrive({
        buffer: Buffer.from('kyoto-photo'),
        uploadFileName: 'kyoto.webp',
        targetFolderId: 'folder-id',
        accessToken: 'access-token',
        photoPath: '/tmp/kyoto.jpg',
      }),
    ).resolves.toEqual({
      publicUrl: 'https://drive.example/kyoto.jpg',
    })

    let uploadBody = fetchMock.mock.calls[0]?.[1]?.body

    expect(uploadBody).toBeInstanceOf(Blob)
    await expect((uploadBody as Blob).text()).resolves.toContain(
      '{"name":"kyoto.webp","parents":["folder-id"]}',
    )
    await expect((uploadBody as Blob).text()).resolves.toContain(
      'Content-Type: image/webp',
    )
  })

  it('surfaces an upload failure and a missing file id response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message: 'upload failed',
          },
        }),
        {
          status: 500,
        },
      ),
    )

    await expect(
      uploadPhotoToGoogleDrive({
        buffer: Buffer.from('kyoto-photo'),
        uploadFileName: 'kyoto.webp',
        targetFolderId: 'folder-id',
        accessToken: 'access-token',
        photoPath: '/tmp/kyoto.jpg',
      }),
    ).rejects.toThrow(
      'Google Drive upload failed for /tmp/kyoto.jpg: upload failed',
    )

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))

    await expect(
      uploadPhotoToGoogleDrive({
        buffer: Buffer.from('kyoto-photo'),
        uploadFileName: 'kyoto.webp',
        targetFolderId: 'folder-id',
        accessToken: 'access-token',
        photoPath: '/tmp/kyoto.jpg',
      }),
    ).rejects.toThrow(
      'Google Drive upload failed for /tmp/kyoto.jpg: missing file id in response.',
    )
  })

  it('surfaces a permission update failure', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'file-id',
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'permission failed',
        }),
        {
          status: 500,
        },
      ),
    )

    await expect(
      uploadPhotoToGoogleDrive({
        buffer: Buffer.from('kyoto-photo'),
        uploadFileName: 'kyoto.webp',
        targetFolderId: 'folder-id',
        accessToken: 'access-token',
        photoPath: '/tmp/kyoto.jpg',
      }),
    ).rejects.toThrow(
      'Google Drive permission update failed: permission failed',
    )
  })

  it('surfaces metadata lookup failures and missing webContentLink', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'file-id',
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
          // eslint-disable-next-line camelcase
          error_description: 'metadata failed',
        }),
        {
          status: 500,
        },
      ),
    )

    await expect(
      uploadPhotoToGoogleDrive({
        buffer: Buffer.from('kyoto-photo'),
        uploadFileName: 'kyoto.webp',
        targetFolderId: 'folder-id',
        accessToken: 'access-token',
        photoPath: '/tmp/kyoto.jpg',
      }),
    ).rejects.toThrow('Google Drive metadata lookup failed: metadata failed')

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'file-id',
        }),
        {
          status: 200,
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))

    await expect(
      uploadPhotoToGoogleDrive({
        buffer: Buffer.from('kyoto-photo'),
        uploadFileName: 'kyoto.webp',
        targetFolderId: 'folder-id',
        accessToken: 'access-token',
        photoPath: '/tmp/kyoto.jpg',
      }),
    ).rejects.toThrow(
      'Google Drive metadata lookup failed: missing webContentLink in response.',
    )
  })
})
