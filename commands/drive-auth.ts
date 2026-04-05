import { cancel, log } from '@clack/prompts'

import { requestGoogleDriveClientCredentials } from '../cli/request-google-drive-client-credentials'
import { requestGoogleDriveRefreshToken } from './drive-auth/request-google-drive-refresh-token'
import { saveGoogleDriveConfig } from '../config/save-google-drive-config'
import { loadGoogleDriveConfig } from '../config/load-google-drive-config'
import { resolveConfigFilePath } from '../paths/resolve-config-file-path'
import { isInteractiveTerminal } from '../cli/is-interactive-terminal'

/**
 * Starts an interactive OAuth flow and saves a Google Drive refresh token for
 * later photo uploads.
 *
 * @param targetPath - Optional YAML config path or project directory path.
 */
export async function driveAuth(targetPath?: string): Promise<void> {
  if (!isInteractiveTerminal()) {
    log.error('`pinbook drive-auth` requires an interactive local terminal.')
    process.exitCode = 1

    return
  }

  let filePath = resolveConfigFilePath(targetPath)
  let savedGoogleDriveConfig = await loadGoogleDriveConfig(filePath)
  let credentials =
    savedGoogleDriveConfig.clientId && savedGoogleDriveConfig.clientSecret ?
      {
        clientSecret: savedGoogleDriveConfig.clientSecret,
        clientId: savedGoogleDriveConfig.clientId,
      }
    : await requestGoogleDriveClientCredentials()

  if (credentials === null) {
    cancel('Drive auth canceled.')
    process.exitCode = 1

    return
  }

  let refreshToken = await requestGoogleDriveRefreshToken(credentials)

  await saveGoogleDriveConfig(filePath, {
    clientSecret: credentials.clientSecret,
    clientId: credentials.clientId,
    refreshToken,
    ...(savedGoogleDriveConfig.folderId ?
      {
        folderId: savedGoogleDriveConfig.folderId,
      }
    : {}),
  })

  log.success('Google Drive auth saved to the local .env file.')
}
