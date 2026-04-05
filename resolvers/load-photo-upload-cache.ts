import type { ZodError } from 'zod'

import { readFile } from 'node:fs/promises'

import type { PhotoUploadCacheSchema } from '../schema/photo-upload-cache-schema'

import { photoUploadCacheSchema } from '../schema/photo-upload-cache-schema'
import { DEFAULT_PHOTO_UPLOAD_CACHE_PATH } from '../constants'

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
   */
  public constructor(issues: string[]) {
    super('Photo upload cache validation failed')
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
   */
  public constructor(message: string) {
    super(message)
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
  try {
    let source = await readFile(filePath, 'utf8')
    let parsed = parseJson(source)
    let result = photoUploadCacheSchema.safeParse(parsed)

    if (!result.success) {
      throw new PhotoUploadCacheValidationError(
        formatZodIssues(result.error).map(
          issue => `${issue.path}: ${issue.message}`,
        ),
      )
    }

    return result.data
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return createEmptyPhotoUploadCache()
    }

    throw error
  }
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
 * Parses JSON cache content and throws a named syntax error on invalid input.
 *
 * @param source - Raw JSON file contents.
 * @returns Parsed JSON value.
 * @throws {PhotoUploadCacheSyntaxError} Thrown when the input is not valid
 *   JSON.
 */
function parseJson(source: string): unknown {
  try {
    return JSON.parse(source) as unknown
  } catch {
    throw new PhotoUploadCacheSyntaxError('Invalid JSON')
  }
}

/**
 * Checks whether the thrown value looks like a Node.js filesystem error.
 *
 * @param error - Unknown thrown value.
 * @returns `true` when the value is an Error with a `code` property.
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException & Error {
  return error instanceof Error && 'code' in error
}

/**
 * Builds the empty default cache used when no photo upload cache exists yet.
 *
 * @returns Empty photo upload cache with the current schema version.
 */
function createEmptyPhotoUploadCache(): PhotoUploadCacheSchema {
  return {
    entries: {},
    version: 1,
  }
}
