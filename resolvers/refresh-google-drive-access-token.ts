import type { GoogleDriveConfig } from '../types/google-drive-config'

import { GoogleDrivePhotoUploadError } from './google-drive-photo-upload-error'
import { extractGoogleErrorMessage } from './extract-google-error-message'
import { readJsonResponse } from './read-json-response'
import { hasStringField } from './has-string-field'

let googleDriveScope = 'https://www.googleapis.com/auth/drive.file'

/**
 * Exchanges a stored refresh token for a short-lived Google Drive access token.
 *
 * @param googleDriveConfig - Google Drive OAuth configuration.
 * @returns Access token that can be used for subsequent Drive API calls.
 */
export async function refreshGoogleDriveAccessToken(
  googleDriveConfig: GoogleDriveConfig,
): Promise<string> {
  /* eslint-disable camelcase */
  let response = await fetch('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      client_secret: googleDriveConfig.clientSecret,
      refresh_token: googleDriveConfig.refreshToken,
      client_id: googleDriveConfig.clientId,
      grant_type: 'refresh_token',
      scope: googleDriveScope,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })
  /* eslint-enable camelcase */

  let payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new GoogleDrivePhotoUploadError(
      `Google Drive authentication failed: ${extractGoogleErrorMessage(payload)}`,
    )
  }

  if (!hasStringField(payload, 'access_token')) {
    throw new GoogleDrivePhotoUploadError(
      'Google Drive authentication failed: missing access token in response.',
    )
  }

  return payload.access_token
}
