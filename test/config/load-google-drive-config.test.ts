import { afterEach, describe, expect, it } from 'vitest'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createTemporaryDirectory } from '../helpers/create-temporary-directory'
import { loadGoogleDriveConfig } from '../../config/load-google-drive-config'

describe('loadGoogleDriveConfig', () => {
  afterEach(() => {
    delete process.env['GOOGLE_DRIVE_CLIENT_ID']
    delete process.env['GOOGLE_DRIVE_CLIENT_SECRET']
    delete process.env['GOOGLE_DRIVE_REFRESH_TOKEN']
    delete process.env['GOOGLE_DRIVE_FOLDER_ID']
  })

  it('loads values from the local .env file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      [
        'GOOGLE_DRIVE_CLIENT_ID=client-id',
        'GOOGLE_DRIVE_CLIENT_SECRET=client-secret',
        'GOOGLE_DRIVE_REFRESH_TOKEN=refresh-token',
        'GOOGLE_DRIVE_FOLDER_ID=folder-id',
      ].join('\n'),
      'utf8',
    )

    await expect(loadGoogleDriveConfig(filePath)).resolves.toEqual({
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      clientId: 'client-id',
      folderId: 'folder-id',
    })
  })

  it('prefers process environment values over the local .env file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      [
        'GOOGLE_DRIVE_CLIENT_ID=client-id',
        'GOOGLE_DRIVE_CLIENT_SECRET=client-secret',
        'GOOGLE_DRIVE_REFRESH_TOKEN=refresh-token',
      ].join('\n'),
      'utf8',
    )
    process.env['GOOGLE_DRIVE_CLIENT_ID'] = 'env-client-id'
    process.env['GOOGLE_DRIVE_FOLDER_ID'] = 'env-folder-id'

    await expect(loadGoogleDriveConfig(filePath)).resolves.toEqual({
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      clientId: 'env-client-id',
      folderId: 'env-folder-id',
    })
  })

  it('omits empty values from the returned config', async () => {
    let temporaryDirectory = await createTemporaryDirectory()

    await expect(
      loadGoogleDriveConfig(join(temporaryDirectory, 'index.yaml')),
    ).resolves.toEqual({})
  })
})
