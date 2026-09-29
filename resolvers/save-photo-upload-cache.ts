import type { PhotoUploadCacheSchema } from '../schema/photo-upload-cache-schema'

import { photoUploadCacheSchema } from '../schema/photo-upload-cache-schema'
import { DEFAULT_PHOTO_UPLOAD_CACHE_PATH } from '../constants'
import { writeJsonFile } from './write-json-file'

/**
 * Saves a validated photo upload cache to disk as pretty-printed JSON.
 *
 * @param cache - Photo upload cache data to persist.
 * @param filePath - Path to the cache JSON file.
 */
export async function savePhotoUploadCache(
  cache: PhotoUploadCacheSchema,
  filePath: string = DEFAULT_PHOTO_UPLOAD_CACHE_PATH,
): Promise<void> {
  await writeJsonFile(filePath, photoUploadCacheSchema.parse(cache))
}
