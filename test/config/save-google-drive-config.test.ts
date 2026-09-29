import { writeFile, readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'

import { createTemporaryDirectory } from '../helpers/create-temporary-directory'
import { saveGoogleDriveConfig } from '../../config/save-google-drive-config'

describe('saveGoogleDriveConfig', () => {
  it('writes Google Drive credentials to the local .env file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await saveGoogleDriveConfig(filePath, {
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      clientId: 'client-id',
      folderId: 'folder-id',
    })

    await expect(
      readFile(join(temporaryDirectory, '.env'), 'utf8'),
    ).resolves.toBe(
      [
        'GOOGLE_DRIVE_CLIENT_ID=client-id',
        'GOOGLE_DRIVE_CLIENT_SECRET=client-secret',
        'GOOGLE_DRIVE_REFRESH_TOKEN=refresh-token',
        'GOOGLE_DRIVE_FOLDER_ID=folder-id',
        '',
      ].join('\n'),
    )
    await expect(
      readFile(join(temporaryDirectory, '.gitignore'), 'utf8'),
    ).resolves.toBe(['.env', ''].join('\n'))
  })

  it('updates existing variables without removing an existing folder id', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      [
        'GOOGLE_DRIVE_CLIENT_ID=old-client-id',
        'GOOGLE_DRIVE_CLIENT_SECRET=old-client-secret',
        'GOOGLE_DRIVE_REFRESH_TOKEN=old-refresh-token',
        'GOOGLE_DRIVE_FOLDER_ID=existing-folder-id',
      ].join('\n'),
      'utf8',
    )

    await saveGoogleDriveConfig(filePath, {
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      clientId: 'client-id',
    })

    await expect(
      readFile(join(temporaryDirectory, '.env'), 'utf8'),
    ).resolves.toBe(
      [
        'GOOGLE_DRIVE_CLIENT_ID=client-id',
        'GOOGLE_DRIVE_CLIENT_SECRET=client-secret',
        'GOOGLE_DRIVE_REFRESH_TOKEN=refresh-token',
        'GOOGLE_DRIVE_FOLDER_ID=existing-folder-id',
        '',
      ].join('\n'),
    )
  })
})
