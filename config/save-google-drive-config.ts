import type { GoogleDriveConfig } from '../types/google-drive-config'

import { saveLocalEnvironment } from './save-local-environment'

/**
 * Persists Google Drive credentials to the local `.env` file next to the YAML
 * config file and ensures that `.env` is ignored by Git in that directory.
 *
 * @param filePath - Path to the YAML config file.
 * @param config - Google Drive credentials to persist.
 */
export async function saveGoogleDriveConfig(
  filePath: string,
  config: GoogleDriveConfig,
): Promise<void> {
  await saveLocalEnvironment(
    filePath,
    /* eslint-disable perfectionist/sort-objects */
    {
      GOOGLE_DRIVE_CLIENT_ID: config.clientId,
      GOOGLE_DRIVE_CLIENT_SECRET: config.clientSecret,
      GOOGLE_DRIVE_REFRESH_TOKEN: config.refreshToken,
      ...(config.folderId && {
        GOOGLE_DRIVE_FOLDER_ID: config.folderId,
      }),
    },
    /* eslint-enable perfectionist/sort-objects */
  )
}
