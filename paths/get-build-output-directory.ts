import { dirname, join } from 'node:path'

import { BUILD_OUTPUT_DIRECTORY_NAME } from '../constants'

/**
 * Returns the directory where build artifacts should be written for a config.
 *
 * @param filePath - Path to the YAML config file.
 * @returns Directory path for build artifacts.
 */
export function getBuildOutputDirectory(filePath: string): string {
  return join(dirname(filePath), BUILD_OUTPUT_DIRECTORY_NAME)
}
