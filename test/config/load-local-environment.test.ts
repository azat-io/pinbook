import { writeFile, mkdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'

import { createTemporaryDirectory } from '../helpers/create-temporary-directory'
import { loadLocalEnvironment } from '../../config/load-local-environment'

describe('loadLocalEnvironment', () => {
  it('returns an empty object when the local .env file does not exist', async () => {
    let temporaryDirectory = await createTemporaryDirectory()

    await expect(
      loadLocalEnvironment(join(temporaryDirectory, 'index.yaml')),
    ).resolves.toEqual({})
  })

  it('parses exported variables, quoted values, comments, and blank lines', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      [
        '# comment',
        '',
        'GOOGLE_DRIVE_CLIENT_ID="client-id"',
        "export GOOGLE_DRIVE_CLIENT_SECRET='client-secret'",
        'GOOGLE_DRIVE_REFRESH_TOKEN=refresh-token',
        'GOOGLE_DRIVE_FOLDER_ID=folder-id',
        'EMPTY_VALUE=',
      ].join('\n'),
      'utf8',
    )

    await expect(loadLocalEnvironment(filePath)).resolves.toEqual({
      GOOGLE_DRIVE_CLIENT_SECRET: 'client-secret',
      GOOGLE_DRIVE_REFRESH_TOKEN: 'refresh-token',
      GOOGLE_DRIVE_CLIENT_ID: 'client-id',
      GOOGLE_DRIVE_FOLDER_ID: 'folder-id',
    })
  })

  it('ignores assignments without a variable name', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      ['=value', 'GOOGLE_DRIVE_CLIENT_ID=client-id'].join('\n'),
      'utf8',
    )

    await expect(loadLocalEnvironment(filePath)).resolves.toEqual({
      GOOGLE_DRIVE_CLIENT_ID: 'client-id',
    })
  })

  it('rethrows unexpected .env read errors', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await mkdir(join(temporaryDirectory, '.env'))

    await expect(loadLocalEnvironment(filePath)).rejects.toBeInstanceOf(Error)
  })
})
