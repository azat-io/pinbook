import { readFile } from 'node:fs/promises'

import type { MapConfigSchema } from '../schema/map-config-schema'

import { validateConfig } from './validate-config'
import { parseYaml } from './parse-yaml'

/**
 * Error thrown when the parsed config does not satisfy the schema.
 */
class ConfigValidationError extends Error {
  /**
   * Formatted validation issues collected during schema validation.
   */
  public issues: string[]

  /**
   * Creates a validation error with a list of human-readable issues.
   *
   * @param issues - Formatted validation issues.
   */
  public constructor(issues: string[]) {
    super('Config validation failed')
    this.name = 'ConfigValidationError'
    this.issues = issues
  }
}

/**
 * Error thrown when the config file contains invalid YAML syntax.
 */
class ConfigSyntaxError extends Error {
  /**
   * Creates a syntax error for invalid YAML content.
   *
   * @param message - Human-readable syntax error message.
   */
  public constructor(message: string) {
    super(message)
    this.name = 'ConfigSyntaxError'
  }
}

/**
 * Reads a config file from disk, parses its YAML, and validates it against the
 * map schema.
 *
 * @param filePath - Path to the YAML config file.
 * @returns A validated and normalized map config.
 * @throws {ConfigSyntaxError} Thrown when the file contains invalid YAML.
 * @throws {ConfigValidationError} Thrown when the parsed YAML does not satisfy
 *   the config schema.
 */
export async function loadConfig(filePath: string): Promise<MapConfigSchema> {
  let source = await readFile(filePath, 'utf8')

  let parsed: unknown

  try {
    parsed = parseYaml(source)
  } catch (error) {
    throw new ConfigSyntaxError(
      error instanceof Error ? error.message : 'Invalid YAML',
    )
  }

  let result = validateConfig(parsed)

  if (!result.success) {
    throw new ConfigValidationError(
      result.issues.map(issue => `${issue.path}: ${issue.message}`),
    )
  }

  return result.data
}
