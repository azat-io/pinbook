import { randomBytes } from 'node:crypto'
import { basename } from 'node:path'

import { GoogleDrivePhotoUploadError } from './google-drive-photo-upload-error'
import { extractGoogleErrorMessage } from './extract-google-error-message'
import { readJsonResponse } from './read-json-response'
import { hasStringField } from './has-string-field'

/**
 * Pieces required to assemble a multipart upload payload for Google Drive.
 */
interface MultipartBodyOptions {
  /**
   * Raw binary photo contents.
   */
  fileBuffer: Buffer

  /**
   * Multipart boundary string shared by all payload parts.
   */
  boundary: string

  /**
   * JSON metadata part sent before the binary file contents.
   */
  metadata: string
}

/**
 * Uploads one local photo to Google Drive, grants public read access, and
 * returns the resulting public URL metadata.
 *
 * @param options - Upload parameters for the local photo.
 * @returns Uploaded photo metadata with the public URL.
 */
export async function uploadPhotoToGoogleDrive(options: {
  targetFolderId: string
  uploadFileName: string
  accessToken: string
  photoPath: string
  buffer: Buffer
}): Promise<{
  publicUrl: string
}> {
  let metadata = JSON.stringify({
    name: basename(options.uploadFileName),
    parents: [options.targetFolderId],
  })
  let boundary = randomBytes(16).toString('hex')
  let createResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?fields=id&supportsAllDrives=true&uploadType=multipart',
    {
      body: new Blob([
        Uint8Array.from(
          buildMultipartBody({
            fileBuffer: options.buffer,
            boundary,
            metadata,
          }),
        ),
      ]),
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
        Authorization: `Bearer ${options.accessToken}`,
      },
      method: 'POST',
    },
  )
  let createPayload = await readJsonResponse(createResponse)

  if (!createResponse.ok) {
    throw new GoogleDrivePhotoUploadError(
      `Google Drive upload failed for ${options.photoPath}: ${extractGoogleErrorMessage(createPayload)}`,
    )
  }

  if (!hasStringField(createPayload, 'id')) {
    throw new GoogleDrivePhotoUploadError(
      `Google Drive upload failed for ${options.photoPath}: missing file id in response.`,
    )
  }

  let fileId = createPayload.id

  await publishPhoto(fileId, options.accessToken)

  let publicUrl = await loadPublicPhotoUrl(fileId, options.accessToken)

  return {
    publicUrl,
  }
}

async function loadPublicPhotoUrl(
  fileId: string,
  accessToken: string,
): Promise<string> {
  let response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )
  let payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new GoogleDrivePhotoUploadError(
      `Google Drive metadata lookup failed: ${extractGoogleErrorMessage(payload)}`,
    )
  }

  if (!hasStringField(payload, 'webContentLink')) {
    throw new GoogleDrivePhotoUploadError(
      'Google Drive metadata lookup failed: missing webContentLink in response.',
    )
  }

  return payload.webContentLink
}

async function publishPhoto(
  fileId: string,
  accessToken: string,
): Promise<void> {
  let response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
      method: 'POST',
    },
  )
  let payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new GoogleDrivePhotoUploadError(
      `Google Drive permission update failed: ${extractGoogleErrorMessage(payload)}`,
    )
  }
}

function buildMultipartBody(options: MultipartBodyOptions): Buffer {
  return Buffer.concat([
    Buffer.from(
      [
        `--${options.boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        options.metadata,
        `--${options.boundary}`,
        'Content-Type: image/webp',
        '',
        '',
      ].join('\r\n'),
      'utf8',
    ),
    options.fileBuffer,
    Buffer.from(`\r\n--${options.boundary}--\r\n`, 'utf8'),
  ])
}
