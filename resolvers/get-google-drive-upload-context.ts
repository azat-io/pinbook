import type { GoogleDriveConfig } from '../types/google-drive-config'

import { refreshGoogleDriveAccessToken } from './refresh-google-drive-access-token'
import { GoogleDrivePhotoUploadError } from './google-drive-photo-upload-error'
import { extractGoogleErrorMessage } from './extract-google-error-message'
import { requireGoogleDriveConfig } from './require-google-drive-config'
import { readJsonResponse } from './read-json-response'
import { hasStringField } from './has-string-field'

let defaultGoogleDriveBaseFolderName = 'Pinbook'
let googleDriveFolderMimeType = 'application/vnd.google-apps.folder'

/**
 * Inputs required to resolve the final Drive folder where map photos will be
 * uploaded.
 */
interface ResolveGoogleDrivePhotoTargetFolderOptions {
  /**
   * Fully validated Google Drive OAuth configuration.
   */
  googleDriveConfig: GoogleDriveConfig

  /**
   * Short-lived Drive access token used for folder lookup and creation.
   */
  accessToken: string

  /**
   * Human-readable map title used as the child folder name.
   */
  mapTitle: string
}

/**
 * Common parameters for Drive folder lookup and creation requests.
 */
interface GoogleDriveFolderOptions {
  /**
   * Parent Drive folder id. When omitted, the folder is resolved in root.
   */
  parentFolderId?: string

  /**
   * Short-lived Drive access token used for API requests.
   */
  accessToken: string

  /**
   * Folder name to look up or create.
   */
  folderName: string
}

/**
 * Returns a memoized Drive upload context for the current build.
 *
 * @param uploadContextPromise - Existing in-flight upload context promise, if
 *   any.
 * @param options - Lazy config inputs needed to initialize the upload context.
 * @returns Shared Drive upload context containing the access token and target
 *   folder id.
 */
export async function getGoogleDriveUploadContext(
  uploadContextPromise:
    | Promise<{
        targetFolderId: string
        accessToken: string
      }>
    | undefined,
  options: {
    googleDriveConfig?: Partial<GoogleDriveConfig>
    mapTitle: string
  },
): Promise<{
  targetFolderId: string
  accessToken: string
}> {
  if (uploadContextPromise) {
    return uploadContextPromise
  }

  let googleDriveConfig = requireGoogleDriveConfig(options.googleDriveConfig)
  let accessToken = await refreshGoogleDriveAccessToken(googleDriveConfig)
  let targetFolderId = await resolveGoogleDrivePhotoTargetFolderId({
    mapTitle: options.mapTitle,
    googleDriveConfig,
    accessToken,
  })

  return {
    targetFolderId,
    accessToken,
  }
}

async function createGoogleDriveFolder(
  options: GoogleDriveFolderOptions,
): Promise<string> {
  let response = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true',
    {
      body: JSON.stringify({
        mimeType: googleDriveFolderMimeType,
        ...(options.parentFolderId ?
          {
            parents: [options.parentFolderId],
          }
        : {}),
        name: options.folderName,
      }),
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  )
  let payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new GoogleDrivePhotoUploadError(
      `Google Drive folder creation failed for "${options.folderName}": ${extractGoogleErrorMessage(payload)}`,
    )
  }

  if (!hasStringField(payload, 'id')) {
    throw new GoogleDrivePhotoUploadError(
      `Google Drive folder creation failed for "${options.folderName}": missing folder id in response.`,
    )
  }

  return payload.id
}

async function findGoogleDriveFolderId(
  options: GoogleDriveFolderOptions,
): Promise<string | null> {
  let searchUrl = new URL('https://www.googleapis.com/drive/v3/files')

  searchUrl.searchParams.set('fields', 'files(id)')
  searchUrl.searchParams.set('includeItemsFromAllDrives', 'true')
  searchUrl.searchParams.set('pageSize', '1')
  searchUrl.searchParams.set('q', buildGoogleDriveFolderQuery(options))
  searchUrl.searchParams.set('supportsAllDrives', 'true')

  let response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
    },
  })
  let payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new GoogleDrivePhotoUploadError(
      `Google Drive folder lookup failed for "${options.folderName}": ${extractGoogleErrorMessage(payload)}`,
    )
  }

  return extractGoogleDriveFolderId(payload)
}

async function resolveGoogleDrivePhotoTargetFolderId(
  options: ResolveGoogleDrivePhotoTargetFolderOptions,
): Promise<string> {
  let baseFolderId =
    options.googleDriveConfig.folderId ??
    (await getOrCreateGoogleDriveFolder({
      folderName: defaultGoogleDriveBaseFolderName,
      accessToken: options.accessToken,
    }))

  return getOrCreateGoogleDriveFolder({
    accessToken: options.accessToken,
    folderName: options.mapTitle,
    parentFolderId: baseFolderId,
  })
}

function buildGoogleDriveFolderQuery(
  options: GoogleDriveFolderOptions,
): string {
  let escapedFolderName = escapeGoogleDriveQueryValue(options.folderName)
  let escapedParentFolderId = escapeGoogleDriveQueryValue(
    options.parentFolderId ?? 'root',
  )

  return [
    `mimeType = '${googleDriveFolderMimeType}'`,
    `name = '${escapedFolderName}'`,
    `'${escapedParentFolderId}' in parents`,
    'trashed = false',
  ].join(' and ')
}

function hasArrayField<Key extends string>(
  value: unknown,
  key: Key,
): value is Record<Key, unknown[]> {
  let record = value as Record<Key, unknown>

  return (
    typeof value === 'object' &&
    value !== null &&
    key in value &&
    Array.isArray(record[key])
  )
}

function extractGoogleDriveFolderId(payload: unknown): string | null {
  if (!hasArrayField(payload, 'files')) {
    return null
  }

  for (let file of payload.files) {
    if (hasStringField(file, 'id')) {
      return file.id
    }
  }

  return null
}

async function getOrCreateGoogleDriveFolder(
  options: GoogleDriveFolderOptions,
): Promise<string> {
  let folderId = await findGoogleDriveFolderId(options)

  if (folderId) {
    return folderId
  }

  return createGoogleDriveFolder(options)
}

function escapeGoogleDriveQueryValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", String.raw`\'`)
}
