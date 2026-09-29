import type { ResolutionCacheSchema } from '../schema/resolution-cache-schema'

import { resolutionCacheSchema } from '../schema/resolution-cache-schema'
import { DEFAULT_RESOLUTION_CACHE_PATH } from '../constants'
import { writeJsonFile } from './write-json-file'

/**
 * Saves a validated resolution cache to disk as pretty-printed JSON.
 *
 * @param cache - Resolution cache data to persist.
 * @param filePath - Path to the cache JSON file.
 */
export async function saveResolutionCache(
  cache: ResolutionCacheSchema,
  filePath: string = DEFAULT_RESOLUTION_CACHE_PATH,
): Promise<void> {
  await writeJsonFile(filePath, resolutionCacheSchema.parse(cache))
}
