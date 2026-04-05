import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { PhotoUploadCacheSchema } from '../schema/photo-upload-cache-schema'

import { photoUploadCacheSchema } from '../schema/photo-upload-cache-schema'
import { DEFAULT_PHOTO_UPLOAD_CACHE_PATH } from '../constants'

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
  let normalizedCache = photoUploadCacheSchema.parse(cache)

  await mkdir(dirname(filePath), {
    recursive: true,
  })

  await writeFile(
    filePath,
    `${JSON.stringify(normalizedCache, null, 2)}\n`,
    'utf8',
  )
}
