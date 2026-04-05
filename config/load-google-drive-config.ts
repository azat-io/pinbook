import type { GoogleDriveConfig } from '../types/google-drive-config'

import { loadLocalEnvironment } from './load-local-environment'

/**
 * Loads Google Drive credentials from the process environment and the local
 * `.env` file next to the YAML config file.
 *
 * Process environment values take precedence over `.env`.
 *
 * @param filePath - Path to the YAML config file.
 * @returns Partial Google Drive config assembled from available inputs.
 */
export async function loadGoogleDriveConfig(
  filePath: string,
): Promise<Partial<GoogleDriveConfig>> {
  let localEnvironment = await loadLocalEnvironment(filePath)

  return {
    ...readGoogleDriveConfig(localEnvironment),
    ...readGoogleDriveConfig(process.env),
  }
}

/**
 * Reads supported Google Drive variables from an environment-like object.
 *
 * @param environment - Process environment or parsed local `.env` values.
 * @returns Partial Google Drive config containing only non-empty values.
 */
function readGoogleDriveConfig(
  environment: Record<string, string> | NodeJS.ProcessEnv,
): Partial<GoogleDriveConfig> {
  let clientId = environment['GOOGLE_DRIVE_CLIENT_ID']?.trim()
  let clientSecret = environment['GOOGLE_DRIVE_CLIENT_SECRET']?.trim()
  let refreshToken = environment['GOOGLE_DRIVE_REFRESH_TOKEN']?.trim()
  let folderId = environment['GOOGLE_DRIVE_FOLDER_ID']?.trim()

  return {
    ...(clientId ? { clientId } : {}),
    ...(clientSecret ? { clientSecret } : {}),
    ...(refreshToken ? { refreshToken } : {}),
    ...(folderId ? { folderId } : {}),
  }
}
