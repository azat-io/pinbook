import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

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
  let environmentPath = join(dirname(filePath), '.env')
  let environmentContents: string

  try {
    environmentContents = await readFile(environmentPath, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {}
    }

    throw error
  }

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
    let rawValue = environmentAssignment.slice(separatorIndex + 1).trim()

    if (key === '') {
      continue
    }

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
