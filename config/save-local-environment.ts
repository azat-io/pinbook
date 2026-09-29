import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { ensureGitIgnoreEntries } from './ensure-gitignore-entries'
import { readOptionalTextFile } from './read-optional-text-file'
import { splitLines } from './split-lines'

/**
 * Persists `KEY=value` assignments to the local `.env` file next to the YAML
 * config file and ensures that `.env` is ignored by Git in that directory.
 *
 * Existing assignments are replaced in place. Missing ones are appended in the
 * order of `values`.
 *
 * @param filePath - Path to the YAML config file.
 * @param values - Environment variable values to persist, keyed by name.
 */
export async function saveLocalEnvironment(
  filePath: string,
  values: Record<string, string>,
): Promise<void> {
  let directoryPath = dirname(filePath)
  let environmentPath = join(directoryPath, '.env')
  let environmentContents = await readOptionalTextFile(environmentPath)
  let environmentLines = splitLines(environmentContents)

  for (let [key, value] of Object.entries(values)) {
    upsertEnvironmentLine(environmentLines, key, value)
  }

  await writeFile(environmentPath, `${environmentLines.join('\n')}\n`, 'utf8')
  await ensureGitIgnoreEntries(directoryPath, ['.env'])
}

/**
 * Inserts or replaces a single `KEY=value` line inside a parsed `.env` file.
 *
 * @param lines - Existing `.env` file lines.
 * @param key - Environment variable name to write.
 * @param value - Environment variable value to persist.
 */
function upsertEnvironmentLine(
  lines: string[],
  key: string,
  value: string,
): void {
  let environmentLine = `${key}=${value}`
  let keyPattern = new RegExp(String.raw`^(?:export\s+)?${key}\s*=`, 'u')
  let lineIndex = lines.findIndex(line => keyPattern.test(line))

  if (lineIndex === -1) {
    lines.push(environmentLine)

    return
  }

  lines[lineIndex] = environmentLine
}
