import type { ZodError, ZodType } from 'zod'

import { readFile } from 'node:fs/promises'

/**
 * Schema, empty value, and named errors of a single JSON cache file format.
 */
interface LoadJsonCacheOptions<Cache> {
  /**
   * Creates the error thrown when the parsed cache does not satisfy the schema.
   *
   * @param error - Zod validation error returned by the cache schema.
   * @returns Named validation error for the cache file.
   */
  createValidationError(error: ZodError): Error

  /**
   * Creates the error thrown when the cache file contains invalid JSON.
   *
   * @param message - Human-readable syntax error message.
   * @returns Named syntax error for the cache file.
   */
  createSyntaxError(message: string): Error

  /**
   * Builds the empty cache returned when the cache file does not exist yet.
   *
   * @returns Empty cache with the current schema version.
   */
  createEmptyCache(): Cache

  /**
   * Schema that validates and normalizes the parsed cache.
   */
  schema: ZodType<Cache>
}

/**
 * Reads a JSON cache file from disk and validates it against its schema, or
 * returns an empty cache when the file does not exist yet.
 *
 * @param filePath - Path to the cache JSON file.
 * @param options - Schema, empty cache, and named errors of the cache format.
 * @returns Parsed and validated cache object.
 * @throws {Error} Thrown with the error from `options.createSyntaxError` when
 *   the file contains invalid JSON, or from `options.createValidationError`
 *   when the parsed cache does not satisfy the schema.
 */
export async function loadJsonCache<Cache>(
  filePath: string,
  options: LoadJsonCacheOptions<Cache>,
): Promise<Cache> {
  let source: string

  try {
    source = await readFile(filePath, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return options.createEmptyCache()
    }

    throw error
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(source)
  } catch {
    throw options.createSyntaxError('Invalid JSON')
  }

  let result = options.schema.safeParse(parsed)

  if (!result.success) {
    throw options.createValidationError(result.error)
  }

  return result.data
}
