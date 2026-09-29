import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { uploadPhotoToGoogleDrive } from '../../resolvers/upload-photo-to-google-drive'
import { createJsonResponse } from '../helpers/create-json-response'

let fetchMock = vi.fn<typeof fetch>()
let originalFetch = fetch

function uploadKyotoPhoto(): ReturnType<typeof uploadPhotoToGoogleDrive> {
  return uploadPhotoToGoogleDrive({
    buffer: Buffer.from('kyoto-photo'),
    uploadFileName: 'kyoto.webp',
    targetFolderId: 'folder-id',
    accessToken: 'access-token',
    photoPath: '/tmp/kyoto.jpg',
  })
}

describe('uploadPhotoToGoogleDrive', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('uploads a photo, publishes it, and returns its file id and public URL', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'file-id',
      }),
    )
    fetchMock.mockResolvedValueOnce(createJsonResponse({}))
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        webContentLink: 'https://drive.example/kyoto.jpg',
      }),
    )

    await expect(uploadKyotoPhoto()).resolves.toEqual({
      publicUrl: 'https://drive.example/kyoto.jpg',
      fileId: 'file-id',
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
      createJsonResponse(
        {
          error: {
            message: 'upload failed',
          },
        },
        500,
      ),
    )

    await expect(uploadKyotoPhoto()).rejects.toThrow(
      'Google Drive upload failed for /tmp/kyoto.jpg: upload failed',
    )

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce(createJsonResponse({}))

    await expect(uploadKyotoPhoto()).rejects.toThrow(
      'Google Drive upload failed for /tmp/kyoto.jpg: missing file id in response.',
    )
  })

  it('surfaces a permission update failure', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'file-id',
      }),
    )
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          message: 'permission failed',
        },
        500,
      ),
    )

    await expect(uploadKyotoPhoto()).rejects.toThrow(
      'Google Drive permission update failed: permission failed',
    )
  })

  it('surfaces metadata lookup failures and missing webContentLink', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'file-id',
      }),
    )
    fetchMock.mockResolvedValueOnce(createJsonResponse({}))
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          // eslint-disable-next-line camelcase
          error_description: 'metadata failed',
        },
        500,
      ),
    )

    await expect(uploadKyotoPhoto()).rejects.toThrow(
      'Google Drive metadata lookup failed: metadata failed',
    )

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'file-id',
      }),
    )
    fetchMock.mockResolvedValueOnce(createJsonResponse({}))
    fetchMock.mockResolvedValueOnce(createJsonResponse({}))

    await expect(uploadKyotoPhoto()).rejects.toThrow(
      'Google Drive metadata lookup failed: missing webContentLink in response.',
    )
  })
})
