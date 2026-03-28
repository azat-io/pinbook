import {
  isAbsolute,
  relative,
  dirname,
  extname,
  resolve,
  parse,
  join,
  sep,
} from 'node:path'
import { readdir, stat } from 'node:fs/promises'

import type { ConfigIssue } from './validate-config'

/**
 * Error thrown when one or more import entries cannot be resolved.
 */
export class ImportsResolutionError extends Error {
  /**
   * Human-readable import resolution issues keyed by config path.
   */
  public issues: ConfigIssue[]

  /**
   * Creates an error with the collected import resolution issues.
   *
   * @param issues - Human-readable import resolution issues.
   */
  public constructor(issues: ConfigIssue[]) {
    super('Import resolution failed')
    this.name = 'ImportsResolutionError'
    this.issues = issues
  }
}

/**
 * Resolves root-level import entries into a deterministic list of YAML files.
 *
 * @param rootFilePath - Absolute path to the root config file.
 * @param importPaths - Import entries declared in the root config.
 * @returns Absolute imported file paths in the final build order.
 * @throws {ImportsResolutionError} Thrown when any import entry is invalid.
 */
export async function expandImports(
  rootFilePath: string,
  importPaths: string[],
): Promise<string[]> {
  let issues: ConfigIssue[] = []
  let resolvedFilePaths: string[] = []
  let seenFilePaths = new Set<string>()
  let importEntries = await Promise.all(
    importPaths.map(async (importPath, index) => {
      let configPath = `imports.${index}`

      try {
        return {
          matchedFilePaths: await resolveImportEntry(rootFilePath, importPath),
          configPath,
          importPath,
        }
      } catch (error) {
        return {
          configPath,
          importPath,
          error,
        }
      }
    }),
  )

  for (let importEntry of importEntries) {
    if ('error' in importEntry) {
      issues.push({
        message:
          importEntry.error instanceof Error ?
            importEntry.error.message
          : 'Invalid import entry',
        path: importEntry.configPath,
      })

      continue
    }

    if (importEntry.matchedFilePaths.length === 0) {
      issues.push({
        message: `Import did not match any YAML files: ${importEntry.importPath}`,
        path: importEntry.configPath,
      })

      continue
    }

    for (let matchedFilePath of importEntry.matchedFilePaths) {
      if (matchedFilePath === rootFilePath) {
        issues.push({
          message: `Import cannot include the root config file: ${importEntry.importPath}`,
          path: importEntry.configPath,
        })

        continue
      }

      if (seenFilePaths.has(matchedFilePath)) {
        issues.push({
          message: `Import resolves the same file more than once: ${toPortablePath(
            relative(dirname(rootFilePath), matchedFilePath),
          )}`,
          path: importEntry.configPath,
        })

        continue
      }

      seenFilePaths.add(matchedFilePath)
      resolvedFilePaths.push(matchedFilePath)
    }
  }

  if (issues.length > 0) {
    throw new ImportsResolutionError(issues)
  }

  return resolvedFilePaths
}

/**
 * Expands path pattern segments starting from a root directory.
 *
 * @param rootPath - File system root path for the absolute pattern.
 * @param patternSegments - Absolute pattern path split into path segments.
 * @returns Matching absolute file paths.
 */
async function expandPatternSegments(
  rootPath: string,
  patternSegments: string[],
): Promise<string[]> {
  return patternSegments.reduce(
    async (currentPathsPromise, segment, index) => {
      let currentPaths = await currentPathsPromise

      if (currentPaths.length === 0) {
        return []
      }

      let isLastSegment = index === patternSegments.length - 1
      let nextPathGroups = await Promise.all(
        currentPaths.map(async currentPath => {
          if (containsWildcard(segment)) {
            let entries = await readdir(currentPath, {
              withFileTypes: true,
            }).catch(error => {
              if (
                error instanceof Error &&
                'code' in error &&
                error.code === 'ENOENT'
              ) {
                return []
              }

              throw error
            })

            return entries
              .filter(entry => matchPathSegment(entry.name, segment))
              .filter(entry =>
                isLastSegment ? entry.isFile() : entry.isDirectory(),
              )
              .map(entry => join(currentPath, entry.name))
          }

          let nextPath = join(currentPath, segment)
          let nextPathStats = await stat(nextPath).catch(error => {
            if (
              error instanceof Error &&
              'code' in error &&
              error.code === 'ENOENT'
            ) {
              return null
            }

            throw error
          })

          if (
            nextPathStats !== null &&
            (isLastSegment ?
              nextPathStats.isFile()
            : nextPathStats.isDirectory())
          ) {
            return [nextPath]
          }

          return []
        }),
      )

      return nextPathGroups.flat()
    },
    Promise.resolve([rootPath]),
  )
}

/**
 * Resolves a single import entry relative to the root config file.
 *
 * @param rootFilePath - Absolute path to the root config file.
 * @param importPath - Relative YAML path or glob pattern.
 * @returns Matching absolute file paths.
 */
async function resolveImportEntry(
  rootFilePath: string,
  importPath: string,
): Promise<string[]> {
  if (isAbsolute(importPath)) {
    throw new Error('Import paths must be relative to the root config file')
  }

  if (importPath.includes('**')) {
    throw new Error('Recursive "**" globs are not supported')
  }

  if (!containsWildcard(importPath)) {
    let exactFilePath = resolve(dirname(rootFilePath), importPath)

    if (!isYamlFilePath(exactFilePath)) {
      throw new Error(
        `Import must point to a .yaml or .yml file: ${importPath}`,
      )
    }

    let exactFileStats = await stat(exactFilePath).catch(error => {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return null
      }

      throw error
    })

    if (exactFileStats === null) {
      return []
    }

    if (!exactFileStats.isFile()) {
      throw new Error(`Import must point to a file: ${importPath}`)
    }

    return [exactFilePath]
  }

  let absolutePatternPath = resolve(dirname(rootFilePath), importPath)
  let patternRootPath = parse(absolutePatternPath).root
  let patternSegments = relative(patternRootPath, absolutePatternPath)
    .split(sep)
    .filter(segment => segment !== '')
  let matchedFilePaths = await expandPatternSegments(
    patternRootPath,
    patternSegments,
  )

  return matchedFilePaths
    .filter(isYamlFilePath)
    .toSorted((left, right) => left.localeCompare(right))
}

/**
 * Tests whether a single path segment matches a simple wildcard segment.
 *
 * @param value - Path segment candidate.
 * @param pattern - Path segment pattern containing `*` and `?`.
 * @returns `true` when the segment matches the pattern.
 */
function matchPathSegment(value: string, pattern: string): boolean {
  let regularExpressionSource = [...pattern]
    .map(character => {
      if (character === '*') {
        return '.*'
      }

      if (character === '?') {
        return '.'
      }

      return character.replaceAll(/[$()+.[\\\]^{|}]/gu, String.raw`\$&`)
    })
    .join('')
  let regularExpression = new RegExp(`^${regularExpressionSource}$`, 'u')

  return regularExpression.test(value)
}

/**
 * Returns whether the provided path points to a YAML file.
 *
 * @param filePath - Candidate file path.
 * @returns `true` when the file extension is `.yaml` or `.yml`.
 */
function isYamlFilePath(filePath: string): boolean {
  let extension = extname(filePath).toLowerCase()

  return extension === '.yaml' || extension === '.yml'
}

/**
 * Returns whether the provided path contains wildcard characters.
 *
 * @param value - Import path candidate.
 * @returns `true` when the path contains glob wildcards.
 */
function containsWildcard(value: string): boolean {
  return value.includes('*') || value.includes('?')
}

/**
 * Converts a path into a portable slash-delimited form for diagnostics.
 *
 * @param value - Native file system path.
 * @returns Slash-delimited path string.
 */
function toPortablePath(value: string): string {
  return value.split(sep).join('/')
}
