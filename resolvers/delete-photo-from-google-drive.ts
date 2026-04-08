import { GoogleDrivePhotoUploadError } from './google-drive-photo-upload-error'
import { extractGoogleErrorMessage } from './extract-google-error-message'
import { readJsonResponse } from './read-json-response'

/**
 * Deletes a Google Drive photo by id.
 *
 * @param options - Target Drive file id and short-lived access token.
 */
export async function deletePhotoFromGoogleDrive(options: {
  accessToken: string
  fileId: string
}): Promise<void> {
  let response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${options.fileId}?supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
      },
      method: 'DELETE',
    },
  )
  let payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new GoogleDrivePhotoUploadError(
      `Google Drive file deletion failed for "${options.fileId}": ${extractGoogleErrorMessage(payload)}`,
    )
  }
}
