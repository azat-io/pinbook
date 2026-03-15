import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * Loads the Google Maps API key from the process environment or a local `.env`
 * file next to the YAML config file.
 *
 * @param filePath - Path to the YAML config file.
 * @returns Google Maps API key or `null` when it is not configured.
 */
export async function loadGoogleMapsApiKey(
  filePath: string,
): Promise<string | null> {
  let environmentApiKey = process.env['GOOGLE_MAPS_API_KEY']?.trim()

  if (environmentApiKey) {
    return environmentApiKey
  }

  let environmentPath = join(dirname(filePath), '.env')
  let environmentContents: string

  try {
    environmentContents = await readFile(environmentPath, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }

  for (let line of environmentContents.split(/\r?\n/u)) {
    let normalizedLine = line.trimStart()

    if (
      !normalizedLine.startsWith('GOOGLE_MAPS_API_KEY=') &&
      !normalizedLine.startsWith('export GOOGLE_MAPS_API_KEY=')
    ) {
      continue
    }

    let environmentAssignment =
      normalizedLine.startsWith('export ') ?
        normalizedLine.slice('export '.length)
      : normalizedLine
    let value = environmentAssignment
      .slice('GOOGLE_MAPS_API_KEY='.length)
      .trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    return value === '' ? null : value
  }

  return null
}
