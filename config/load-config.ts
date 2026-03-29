import { relative, dirname, sep } from 'node:path'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'

import type { MapConfigSchema } from '../schema/map-config-schema'
import type { ConfigIssue } from './validate-config'

import { ImportsResolutionError, expandImports } from './expand-imports'
import { mapMetaSchema } from '../schema/map-meta-schema'
import { layerSchema } from '../schema/layer-schema'
import { formatZodIssues } from './validate-config'
import { validateConfig } from './validate-config'
import { pinSchema } from '../schema/pin-schema'
import { parseYaml } from './parse-yaml'

let sourceMapConfigSchema = z
  .object({
    imports: z
      .array(z.string().trim().min(1))
      .default([])
      .describe('Optional list of relative YAML paths or glob patterns'),
    layers: z
      .array(layerSchema)
      .default([])
      .describe('Optional list of logical layers used to organize pins'),
    pins: z
      .array(pinSchema)
      .default([])
      .describe('Optional list of pins defined directly in the root config'),
    map: mapMetaSchema.describe(
      'Map-level metadata such as title and description',
    ),
  })
  .strict()

let importedPinsConfigSchema = z
  .object({
    pins: z
      .array(pinSchema)
      .min(1)
      .describe('List of pins contributed by this imported YAML file'),
  })
  .strict()

interface PinSource {
  filePath: string
  pinIndex: number
}

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
  let parsedRootConfig = await parseConfigYamlFile(filePath)
  let rootResult = sourceMapConfigSchema.safeParse(parsedRootConfig)

  if (!rootResult.success) {
    throw new ConfigValidationError(
      formatZodIssues(rootResult.error).map(
        issue => `${issue.path}: ${issue.message}`,
      ),
    )
  }

  let importedFilePaths: string[]

  try {
    importedFilePaths = await expandImports(filePath, rootResult.data.imports)
  } catch (error) {
    if (!(error instanceof ImportsResolutionError)) {
      throw error
    }

    throw new ConfigValidationError(
      error.issues.map(issue => `${issue.path}: ${issue.message}`),
    )
  }

  let pins = [...rootResult.data.pins]
  let pinSources: PinSource[] = rootResult.data.pins.map((_, pinIndex) => ({
    filePath,
    pinIndex,
  }))
  let importedConfigs = await Promise.all(
    importedFilePaths.map(async importedFilePath => ({
      importedConfig: await loadImportedPinsConfig(filePath, importedFilePath),
      filePath: importedFilePath,
    })),
  )

  for (let { filePath: importedFilePath, importedConfig } of importedConfigs) {
    for (let [pinIndex, pin] of importedConfig.pins.entries()) {
      pins.push(pin)
      pinSources.push({
        filePath: importedFilePath,
        pinIndex,
      })
    }
  }

  let result = validateConfig({
    layers: rootResult.data.layers,
    map: rootResult.data.map,
    pins,
  })

  if (!result.success) {
    throw new ConfigValidationError(
      result.issues.map(issue =>
        formatMergedConfigIssue(issue, filePath, pinSources),
      ),
    )
  }

  return result.data
}

/**
 * Formats a merged-config validation issue and maps imported pins back to their
 * originating file and local pin index when possible.
 *
 * @param issue - Validation issue for the merged config.
 * @param rootFilePath - Absolute root config path.
 * @param pinSources - Source file and local index for each merged pin.
 * @returns CLI-friendly issue string.
 */
function formatMergedConfigIssue(
  issue: ConfigIssue,
  rootFilePath: string,
  pinSources: PinSource[],
): string {
  if (!issue.path.startsWith('pins.')) {
    return `${issue.path}: ${issue.message}`
  }

  let pathSegments = issue.path.split('.')
  let mergedPinIndex = Number(pathSegments[1])
  let pinSource = pinSources[mergedPinIndex]

  if (!pinSource || pinSource.filePath === rootFilePath) {
    return `${issue.path}: ${issue.message}`
  }

  let localPath = ['pins', String(pinSource.pinIndex), ...pathSegments.slice(2)]
    .filter(segment => segment !== '')
    .join('.')

  return `${formatConfigFilePath(rootFilePath, pinSource.filePath)}: ${localPath}: ${issue.message}`
}

/**
 * Loads, parses, and validates a single imported pins file.
 *
 * @param rootFilePath - Absolute root config path.
 * @param importedFilePath - Absolute imported file path.
 * @returns Validated imported pins config.
 * @throws {ConfigSyntaxError} Thrown when the imported file contains invalid
 *   YAML.
 * @throws {ConfigValidationError} Thrown when the imported file shape is
 *   invalid.
 */
async function loadImportedPinsConfig(
  rootFilePath: string,
  importedFilePath: string,
): Promise<{
  pins: MapConfigSchema['pins']
}> {
  let parsedImportedConfig = await parseConfigYamlFile(
    importedFilePath,
    rootFilePath,
  )
  let importedResult = importedPinsConfigSchema.safeParse(parsedImportedConfig)

  if (!importedResult.success) {
    throw new ConfigValidationError(
      formatZodIssues(importedResult.error).map(issue =>
        formatImportedConfigIssue(rootFilePath, importedFilePath, issue),
      ),
    )
  }

  return importedResult.data
}

/**
 * Reads and parses a YAML file from disk with file-aware syntax errors.
 *
 * @param filePath - Path to the YAML file.
 * @param rootFilePath - Optional root config path for relative diagnostics.
 * @returns Parsed YAML value.
 * @throws {ConfigSyntaxError} Thrown when the file contains invalid YAML.
 */
async function parseConfigYamlFile(
  filePath: string,
  rootFilePath = filePath,
): Promise<unknown> {
  let source = await readFile(filePath, 'utf8')

  try {
    return parseYaml(source)
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : 'Invalid YAML'

    if (filePath === rootFilePath) {
      throw new ConfigSyntaxError(errorMessage)
    }

    throw new ConfigSyntaxError(
      `${formatConfigFilePath(rootFilePath, filePath)}: ${errorMessage}`,
    )
  }
}

/**
 * Formats an imported-file validation issue with its relative file path.
 *
 * @param rootFilePath - Absolute root config path.
 * @param importedFilePath - Absolute imported file path.
 * @param issue - Validation issue for the imported file.
 * @returns CLI-friendly issue string.
 */
function formatImportedConfigIssue(
  rootFilePath: string,
  importedFilePath: string,
  issue: ConfigIssue,
): string {
  return `${formatConfigFilePath(rootFilePath, importedFilePath)}: ${issue.path}: ${issue.message}`
}

/**
 * Formats a config file path relative to the root config directory.
 *
 * @param rootFilePath - Absolute root config path.
 * @param targetFilePath - Absolute target config path.
 * @returns Portable slash-delimited relative path.
 */
function formatConfigFilePath(
  rootFilePath: string,
  targetFilePath: string,
): string {
  return relative(dirname(rootFilePath), targetFilePath).split(sep).join('/')
}
