import { dirname, join } from 'node:path'

import { DEFAULT_PHOTO_UPLOAD_CACHE_PATH } from '../constants'

/**
 * Returns the hidden cache path for uploaded photo metadata.
 *
 * @param filePath - Path to the YAML config file.
 * @returns Path to the hidden photo upload cache JSON file.
 */
export function getDefaultPhotoUploadCachePath(filePath: string): string {
  return join(dirname(filePath), DEFAULT_PHOTO_UPLOAD_CACHE_PATH)
}
