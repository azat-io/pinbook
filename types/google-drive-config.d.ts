/**
 * Credentials and optional target folder for uploading photos to Google Drive.
 */
export interface GoogleDriveConfig {
  /**
   * OAuth 2.0 desktop client secret from Google Cloud.
   */
  clientSecret: string

  /**
   * Offline refresh token used to mint short-lived Drive access tokens.
   */
  refreshToken: string

  /**
   * Optional Google Drive folder ID where uploaded photos should be stored.
   */
  folderId?: string

  /**
   * OAuth 2.0 desktop client identifier from Google Cloud.
   */
  clientId: string
}
