import { writeFile, mkdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'

import { createTemporaryDirectory } from '../helpers/create-temporary-directory'
import { readOptionalTextFile } from '../../config/read-optional-text-file'

describe('readOptionalTextFile', () => {
  it('reads the contents of an existing UTF-8 text file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'notes.txt')

    await writeFile(filePath, 'hello from pinbook\n', 'utf8')

    await expect(readOptionalTextFile(filePath)).resolves.toBe(
      'hello from pinbook\n',
    )
  })

  it('returns an empty string when the file is missing', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'missing.txt')

    await expect(readOptionalTextFile(filePath)).resolves.toBe('')
  })

  it('rethrows unexpected file system errors', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let directoryPath = join(temporaryDirectory, 'notes.txt')

    await mkdir(directoryPath)

    await expect(readOptionalTextFile(directoryPath)).rejects.toBeInstanceOf(
      Error,
    )
  })
})
