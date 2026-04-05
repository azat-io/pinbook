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
 * Normalized photo dimensions used for Google Drive uploads.
 */
export const PHOTO_UPLOAD_WIDTH = 1200
export const PHOTO_UPLOAD_HEIGHT = 800

/**
 * Fixed rendered photo dimensions used in placemark descriptions.
 */
export const PHOTO_RENDER_WIDTH = 300
export const PHOTO_RENDER_HEIGHT = 200

/**
 * Default quality used when converting uploaded images to WebP.
 */
export const PHOTO_UPLOAD_WEBP_QUALITY = 82

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
