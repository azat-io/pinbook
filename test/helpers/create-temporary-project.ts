import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { createTemporaryDirectory } from './create-temporary-directory'

/**
 * Creates a temporary Pinbook project with the provided files.
 *
 * @param files - File contents keyed by path relative to the project root.
 * @returns Absolute path to the project's root `index.yaml` file.
 */
export async function createTemporaryProject(
  files: Record<string, string>,
): Promise<string> {
  let temporaryDirectory = await createTemporaryDirectory()

  await Promise.all(
    Object.entries(files).map(async ([relativeFilePath, content]) => {
      let filePath = join(temporaryDirectory, relativeFilePath)

      await mkdir(dirname(filePath), {
        recursive: true,
      })
      await writeFile(filePath, content, 'utf8')
    }),
  )

  return join(temporaryDirectory, 'index.yaml')
}
