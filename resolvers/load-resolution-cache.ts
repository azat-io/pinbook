import type { ZodError } from 'zod'

import { readFile } from 'node:fs/promises'

import type { ResolutionCacheSchema } from '../schema/resolution-cache-schema'

import { resolutionCacheSchema } from '../schema/resolution-cache-schema'
import { DEFAULT_RESOLUTION_CACHE_PATH } from '../constants'

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
   */
  public constructor(issues: string[]) {
    super('Resolution cache validation failed')
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
   */
  public constructor(message: string) {
    super(message)
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
  let source: string

  try {
    source = await readFile(filePath, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return createEmptyResolutionCache()
    }

    throw error
  }

  let parsed = parseJson(source)
  let result = resolutionCacheSchema.safeParse(parsed)

  if (!result.success) {
    throw new ResolutionCacheValidationError(formatZodIssues(result.error))
  }

  return result.data
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
 * Parses JSON cache content and throws a named syntax error on invalid input.
 *
 * @param source - Raw JSON file contents.
 * @returns Parsed JSON value.
 * @throws {ResolutionCacheSyntaxError} Thrown when the input is not valid JSON.
 */
function parseJson(source: string): unknown {
  try {
    return JSON.parse(source) as unknown
  } catch {
    throw new ResolutionCacheSyntaxError('Invalid JSON')
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
