import { join } from 'node:path'

import { getBuildOutputDirectory } from './get-build-output-directory'
import { BUILD_OUTPUT_FILE_NAME } from '../constants'

/**
 * Returns the output path for the generated KML artifact.
 *
 * @param filePath - Path to the YAML config file.
 * @returns Output path for the built KML file.
 */
export function getBuildOutputPath(filePath: string): string {
  return join(getBuildOutputDirectory(filePath), BUILD_OUTPUT_FILE_NAME)
}
