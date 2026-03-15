import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { ensureGitIgnoreEntries } from './ensure-gitignore-entries'
import { readOptionalTextFile } from './read-optional-text-file'
import { splitLines } from './split-lines'

/**
 * Persists the Google Maps API key to a local `.env` file next to the YAML
 * config file and ensures that `.env` is ignored by Git in that directory.
 *
 * @param filePath - Path to the YAML config file.
 * @param apiKey - Google Maps API key to persist.
 */
export async function saveGoogleMapsApiKey(
  filePath: string,
  apiKey: string,
): Promise<void> {
  let directoryPath = dirname(filePath)
  let environmentPath = join(directoryPath, '.env')
  let environmentContents = await readOptionalTextFile(environmentPath)
  let environmentLine = `GOOGLE_MAPS_API_KEY=${apiKey}`
  let environmentLines = splitLines(environmentContents)
  let googleMapsApiKeyLineIndex = environmentLines.findIndex(line =>
    /^(?:export\s+)?GOOGLE_MAPS_API_KEY\s*=/u.test(line),
  )

  if (googleMapsApiKeyLineIndex === -1) {
    environmentLines.push(environmentLine)
  } else {
    environmentLines[googleMapsApiKeyLineIndex] = environmentLine
  }

  await writeFile(environmentPath, `${environmentLines.join('\n')}\n`, 'utf8')
  await ensureGitIgnoreEntries(directoryPath, ['.env'])
}
