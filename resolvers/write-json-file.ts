import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Writes a value to disk as pretty-printed JSON, creating missing parent
 * directories first.
 *
 * @param filePath - Path to the JSON file.
 * @param value - JSON-serializable value to persist.
 */
export async function writeJsonFile(
  filePath: string,
  value: unknown,
): Promise<void> {
  await mkdir(dirname(filePath), {
    recursive: true,
  })

  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}
