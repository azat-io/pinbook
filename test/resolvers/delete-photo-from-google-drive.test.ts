import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { deletePhotoFromGoogleDrive } from '../../resolvers/delete-photo-from-google-drive'

let fetchMock = vi.fn<typeof fetch>()
let originalFetch = fetch

describe('deletePhotoFromGoogleDrive', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('deletes a Google Drive photo', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(
      deletePhotoFromGoogleDrive({
        accessToken: 'access-token',
        fileId: 'file-id',
      }),
    ).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3/files/file-id?supportsAllDrives=true',
      {
        headers: {
          Authorization: 'Bearer access-token',
        },
        method: 'DELETE',
      },
    )
  })

  it('surfaces a Google Drive deletion failure', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message: 'delete failed',
          },
        }),
        {
          status: 500,
        },
      ),
    )

    await expect(
      deletePhotoFromGoogleDrive({
        accessToken: 'access-token',
        fileId: 'file-id',
      }),
    ).rejects.toThrow(
      'Google Drive file deletion failed for "file-id": delete failed',
    )
  })
})
