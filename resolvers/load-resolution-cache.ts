import type { ZodError } from 'zod'

import type { ResolutionCacheSchema } from '../schema/resolution-cache-schema'

import { resolutionCacheSchema } from '../schema/resolution-cache-schema'
import { DEFAULT_RESOLUTION_CACHE_PATH } from '../constants'
import { loadJsonCache } from './load-json-cache'

/**
 * Error thrown when the parsed resolution cache does not satisfy the schema.
 */
class ResolutionCacheValidationError extends Error {
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
    super('Resolution cache validation failed', options)
    this.name = 'ResolutionCacheValidationError'
    this.issues = issues
  }
}

/**
 * Error thrown when the resolution cache file contains invalid JSON.
 */
export class ResolutionCacheSyntaxError extends Error {
  /**
   * Creates a syntax error for invalid JSON cache content.
   *
   * @param message - Human-readable syntax error message.
   * @param options - Standard error options such as `cause`.
   */
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ResolutionCacheSyntaxError'
  }
}

/**
 * Loads and validates the local address resolution cache.
 *
 * @param filePath - Path to the cache JSON file.
 * @returns A validated resolution cache or an empty default cache if the file
 *   does not exist.
 */
export async function loadResolutionCache(
  filePath: string = DEFAULT_RESOLUTION_CACHE_PATH,
): Promise<ResolutionCacheSchema> {
  return loadJsonCache(filePath, {
    createValidationError: error =>
      new ResolutionCacheValidationError(formatZodIssues(error)),
    createSyntaxError: message => new ResolutionCacheSyntaxError(message),
    createEmptyCache: createEmptyResolutionCache,
    schema: resolutionCacheSchema,
  })
}

/**
 * Converts cache schema validation issues into compact CLI-friendly messages.
 *
 * @param error - Raw Zod validation error for the cache payload.
 * @returns Human-readable issues with dot-delimited paths.
 */
function formatZodIssues(error: ZodError): string[] {
  return error.issues.map(issue => {
    let path = issue.path.length > 0 ? issue.path.join('.') : 'root'

    return `${path}: ${issue.message}`
  })
}

/**
 * Builds the empty default cache used when no cache file exists yet.
 *
 * @returns Empty resolution cache with the current schema version.
 */
function createEmptyResolutionCache(): ResolutionCacheSchema {
  return {
    addresses: {},
    version: 1,
  }
}
