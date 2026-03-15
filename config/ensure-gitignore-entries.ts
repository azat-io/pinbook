import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { readOptionalTextFile } from './read-optional-text-file'
import { splitLines } from './split-lines'

/**
 * Ensures that a local `.gitignore` file contains the provided entries.
 *
 * @param directoryPath - Directory that owns the `.gitignore` file.
 * @param entries - Ignore entries that must exist in the file.
 */
export async function ensureGitIgnoreEntries(
  directoryPath: string,
  entries: string[],
): Promise<void> {
  let gitIgnorePath = join(directoryPath, '.gitignore')
  let gitIgnoreContents = await readOptionalTextFile(gitIgnorePath)
  let gitIgnoreLines = splitLines(gitIgnoreContents)
  let nextGitIgnoreLines = [...gitIgnoreLines]

  for (let entry of entries) {
    if (!nextGitIgnoreLines.includes(entry)) {
      nextGitIgnoreLines.push(entry)
    }
  }

  if (nextGitIgnoreLines.length === gitIgnoreLines.length) {
    return
  }

  await writeFile(gitIgnorePath, `${nextGitIgnoreLines.join('\n')}\n`, 'utf8')
}
