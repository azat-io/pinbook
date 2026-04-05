import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadGoogleDriveConfig } from '../../config/load-google-drive-config'

let temporaryDirectories: string[] = []

async function createTemporaryConfigDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(
    join(tmpdir(), 'pinbook-drive-config-'),
  )

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('loadGoogleDriveConfig', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
    delete process.env['GOOGLE_DRIVE_CLIENT_ID']
    delete process.env['GOOGLE_DRIVE_CLIENT_SECRET']
    delete process.env['GOOGLE_DRIVE_REFRESH_TOKEN']
    delete process.env['GOOGLE_DRIVE_FOLDER_ID']
  })

  it('loads values from the local .env file', async () => {
    let temporaryDirectory = await createTemporaryConfigDirectory()
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
    let temporaryDirectory = await createTemporaryConfigDirectory()
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
    let temporaryDirectory = await createTemporaryConfigDirectory()

    await expect(
      loadGoogleDriveConfig(join(temporaryDirectory, 'index.yaml')),
    ).resolves.toEqual({})
  })
})
