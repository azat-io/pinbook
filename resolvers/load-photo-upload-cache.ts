import type { ZodError } from 'zod'

import type { PhotoUploadCacheSchema } from '../schema/photo-upload-cache-schema'

import { photoUploadCacheSchema } from '../schema/photo-upload-cache-schema'
import { DEFAULT_PHOTO_UPLOAD_CACHE_PATH } from '../constants'
import { loadJsonCache } from './load-json-cache'

/**
 * Error thrown when the parsed photo upload cache does not satisfy the schema.
 */
export class PhotoUploadCacheValidationError extends Error {
  /**
   * Formatted validation issues collected during cache validation.
   */
  public issues: string[]

  /**
   * Creates a validation error with a list of human-readable issues.
   *
   * @param issues - Formatted validation issues.
   * @param options - Standard error options such as `cause`.
   */
  public constructor(issues: string[], options?: ErrorOptions) {
    super('Photo upload cache validation failed', options)
    this.name = 'PhotoUploadCacheValidationError'
    this.issues = issues
  }
}

/**
 * Error thrown when the photo upload cache file contains invalid JSON.
 */
export class PhotoUploadCacheSyntaxError extends Error {
  /**
   * Creates a syntax error for invalid JSON cache content.
   *
   * @param message - Human-readable syntax error message.
   * @param options - Standard error options such as `cause`.
   */
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PhotoUploadCacheSyntaxError'
  }
}

/**
 * Reads the photo upload cache from disk, or returns an empty cache when it
 * does not exist yet.
 *
 * @param filePath - Path to the photo upload cache JSON file.
 * @returns Parsed and validated cache object.
 */
export async function loadPhotoUploadCache(
  filePath: string = DEFAULT_PHOTO_UPLOAD_CACHE_PATH,
): Promise<PhotoUploadCacheSchema> {
  return loadJsonCache(filePath, {
    createValidationError: error =>
      new PhotoUploadCacheValidationError(
        formatZodIssues(error).map(issue => `${issue.path}: ${issue.message}`),
      ),
    createSyntaxError: message => new PhotoUploadCacheSyntaxError(message),
    createEmptyCache: createEmptyPhotoUploadCache,
    schema: photoUploadCacheSchema,
  })
}

/**
 * Formats Zod validation issues for CLI-friendly cache diagnostics.
 *
 * @param error - Zod validation error returned by the cache schema.
 * @returns List of issue objects with string paths and messages.
 */
function formatZodIssues(error: ZodError): { message: string; path: string }[] {
  return error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Builds the empty default cache used when no photo upload cache exists yet.
 *
 * @returns Empty photo upload cache with the current schema version.
 */
function createEmptyPhotoUploadCache(): PhotoUploadCacheSchema {
  return {
    entries: {},
    version: 2,
  }
}
