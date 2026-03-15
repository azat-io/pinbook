import type { ZodError } from 'zod'

import type { MapConfigSchema } from '../schema/map-config-schema'

import { mapConfigSchema } from '../schema/map-config-schema'

/**
 * Validation result returned when the config is invalid.
 */
interface ConfigValidationFailure {
  /**
   * Human-readable validation issues keyed by config path.
   */
  issues: ConfigIssue[]

  /**
   * Indicates that validation failed.
   */
  success: false
}

/**
 * Validation result returned when the config is valid.
 */
interface ConfigValidationSuccess {
  /**
   * Parsed, validated, and normalized config data.
   */
  data: MapConfigSchema

  /**
   * Indicates that validation succeeded.
   */
  success: true
}

/**
 * A single human-readable validation issue.
 */
interface ConfigIssue {
  /**
   * Human-readable validation error message.
   */
  message: string

  /**
   * Dot-delimited path to the invalid config value.
   */
  path: string
}

/**
 * Result of validating an unknown input against the map config schema.
 */
type ConfigValidationResult = ConfigValidationSuccess | ConfigValidationFailure

/**
 * Validates an unknown input against the map config schema.
 *
 * @param input - Parsed config data to validate.
 * @returns Validation result containing either normalized config data or
 *   formatted issues.
 */
export function validateConfig(input: unknown): ConfigValidationResult {
  let result = mapConfigSchema.safeParse(input)

  if (result.success) {
    return {
      data: result.data,
      success: true,
    }
  }

  return {
    issues: formatZodIssues(result.error),
    success: false,
  }
}

/**
 * Converts a Zod error into a compact list of CLI-friendly issues.
 *
 * @param error - Raw Zod validation error.
 * @returns Human-readable validation issues with dot-delimited paths.
 */
function formatZodIssues(error: ZodError): ConfigIssue[] {
  return error.issues.map(issue => ({
    path: issue.path.length > 0 ? issue.path.join('.') : 'root',
    message: issue.message,
  }))
}
