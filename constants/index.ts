import { join } from 'node:path'

/**
 * Name of the directory where build command artifacts are written.
 */
export const BUILD_OUTPUT_DIRECTORY_NAME = '.pinbook'

/**
 * Name of the file where the build command writes its KML output.
 */
export const BUILD_OUTPUT_FILE_NAME = 'map.kml'

/**
 * Relative path to the hidden directory where the resolution cache is stored.
 */
const RESOLUTION_CACHE_DIRECTORY = join('node_modules', '.cache', 'pinbook')

/**
 * Name of the resolution cache file.
 */
const RESOLUTION_CACHE_FILE_NAME = 'cache.json'
const PHOTO_UPLOAD_CACHE_FILE_NAME = 'photo-cache.json'

/**
 * Default hidden resolution cache path relative to the current working
 * directory.
 */
export const DEFAULT_RESOLUTION_CACHE_PATH = join(
  RESOLUTION_CACHE_DIRECTORY,
  RESOLUTION_CACHE_FILE_NAME,
)

/**
 * Default hidden cache path relative to the current working directory for
 * Google Drive photo uploads.
 */
export const DEFAULT_PHOTO_UPLOAD_CACHE_PATH = join(
  RESOLUTION_CACHE_DIRECTORY,
  PHOTO_UPLOAD_CACHE_FILE_NAME,
)
