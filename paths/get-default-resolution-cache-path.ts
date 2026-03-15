import { dirname, join } from 'node:path'

import { DEFAULT_RESOLUTION_CACHE_PATH } from '../constants'

/**
 * Returns the hidden resolution cache path for a config.
 *
 * @param filePath - Path to the YAML config file.
 * @returns Path to the hidden resolution cache JSON file.
 */
export function getDefaultResolutionCachePath(filePath: string): string {
  return join(dirname(filePath), DEFAULT_RESOLUTION_CACHE_PATH)
}
