import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { GoogleDriveConfig } from '../types/google-drive-config'

import { ensureGitIgnoreEntries } from './ensure-gitignore-entries'
import { readOptionalTextFile } from './read-optional-text-file'
import { splitLines } from './split-lines'

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
  let directoryPath = dirname(filePath)
  let environmentPath = join(directoryPath, '.env')
  let environmentContents = await readOptionalTextFile(environmentPath)
  let environmentLines = splitLines(environmentContents)

  upsertEnvironmentLine(
    environmentLines,
    'GOOGLE_DRIVE_CLIENT_ID',
    config.clientId,
  )
  upsertEnvironmentLine(
    environmentLines,
    'GOOGLE_DRIVE_CLIENT_SECRET',
    config.clientSecret,
  )
  upsertEnvironmentLine(
    environmentLines,
    'GOOGLE_DRIVE_REFRESH_TOKEN',
    config.refreshToken,
  )

  if (config.folderId) {
    upsertEnvironmentLine(
      environmentLines,
      'GOOGLE_DRIVE_FOLDER_ID',
      config.folderId,
    )
  }

  await writeFile(environmentPath, `${environmentLines.join('\n')}\n`, 'utf8')
  await ensureGitIgnoreEntries(directoryPath, ['.env'])
}

/**
 * Inserts or replaces a single `KEY=value` line inside a parsed `.env` file.
 *
 * @param lines - Existing `.env` file lines.
 * @param key - Environment variable name to write.
 * @param value - Environment variable value to persist.
 */
function upsertEnvironmentLine(
  lines: string[],
  key: string,
  value: string,
): void {
  let environmentLine = `${key}=${value}`
  let lineIndex = lines.findIndex(line =>
    new RegExp(String.raw`^(?:export\s+)?${key}\s*=`, 'u').test(line),
  )

  if (lineIndex === -1) {
    lines.push(environmentLine)

    return
  }

  lines[lineIndex] = environmentLine
}
