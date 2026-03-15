import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { ResolutionCacheSchema } from '../schema/resolution-cache-schema'

import { resolutionCacheSchema } from '../schema/resolution-cache-schema'
import { DEFAULT_RESOLUTION_CACHE_PATH } from '../constants'

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
  let normalizedCache = resolutionCacheSchema.parse(cache)

  await mkdir(dirname(filePath), {
    recursive: true,
  })

  await writeFile(
    filePath,
    `${JSON.stringify(normalizedCache, null, 2)}\n`,
    'utf8',
  )
}
