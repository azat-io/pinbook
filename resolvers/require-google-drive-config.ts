import type { GoogleDriveConfig } from '../types/google-drive-config'

import { GoogleDriveConfigurationError } from './google-drive-configuration-error'

/**
 * Validates that all required Drive OAuth values are present.
 *
 * @param googleDriveConfig - Partial Drive config loaded from environment.
 * @returns Fully populated Drive config safe to use for uploads.
 * @throws {GoogleDriveConfigurationError} Thrown when required variables are
 *   missing.
 */
export function requireGoogleDriveConfig(
  googleDriveConfig: Partial<GoogleDriveConfig> | undefined,
): GoogleDriveConfig {
  let missingVariables: string[] = []

  if (!googleDriveConfig?.clientId) {
    missingVariables.push('GOOGLE_DRIVE_CLIENT_ID')
  }

  if (!googleDriveConfig?.clientSecret) {
    missingVariables.push('GOOGLE_DRIVE_CLIENT_SECRET')
  }

  if (!googleDriveConfig?.refreshToken) {
    missingVariables.push('GOOGLE_DRIVE_REFRESH_TOKEN')
  }

  if (missingVariables.length > 0) {
    throw new GoogleDriveConfigurationError(missingVariables)
  }

  return {
    clientSecret: googleDriveConfig!.clientSecret!,
    refreshToken: googleDriveConfig!.refreshToken!,
    clientId: googleDriveConfig!.clientId!,
    ...(googleDriveConfig?.folderId ?
      { folderId: googleDriveConfig.folderId }
    : {}),
  }
}
