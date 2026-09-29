import { dirname, join } from 'node:path'

import { readOptionalTextFile } from './read-optional-text-file'

/**
 * Loads simple `KEY=value` assignments from a local `.env` file next to the
 * YAML config file.
 *
 * @param filePath - Path to the YAML config file.
 * @returns Parsed environment values from the local `.env` file.
 */
export async function loadLocalEnvironment(
  filePath: string,
): Promise<Record<string, string>> {
  let environmentContents = await readOptionalTextFile(
    join(dirname(filePath), '.env'),
  )
  let environment: Record<string, string> = {}

  for (let line of environmentContents.split(/\r?\n/u)) {
    let normalizedLine = line.trim()

    if (
      normalizedLine === '' ||
      normalizedLine.startsWith('#') ||
      !normalizedLine.includes('=')
    ) {
      continue
    }

    let environmentAssignment =
      normalizedLine.startsWith('export ') ?
        normalizedLine.slice('export '.length)
      : normalizedLine
    let separatorIndex = environmentAssignment.indexOf('=')
    let key = environmentAssignment.slice(0, separatorIndex).trim()

    if (key === '') {
      continue
    }

    let rawValue = environmentAssignment.slice(separatorIndex + 1).trim()

    let value =
      (
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
      ) ?
        rawValue.slice(1, -1)
      : rawValue

    if (value !== '') {
      environment[key] = value
    }
  }

  return environment
}
