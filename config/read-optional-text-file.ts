import { readFile } from 'node:fs/promises'

/**
 * Reads a UTF-8 text file and returns an empty string when the file is missing.
 *
 * @param filePath - Path to the text file that should be read.
 * @returns File contents or an empty string when the file does not exist.
 */
export async function readOptionalTextFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return ''
    }

    throw error
  }
}
