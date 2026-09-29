import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'

import { createTemporaryDirectory } from '../helpers/create-temporary-directory'
import { saveGoogleMapsApiKey } from '../../config/save-google-maps-api-key'

describe('saveGoogleMapsApiKey', () => {
  it('creates a local .env file and .gitignore entry when they are missing', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await saveGoogleMapsApiKey(filePath, 'created-key')

    await expect(
      readFile(join(temporaryDirectory, '.env'), 'utf8'),
    ).resolves.toBe('GOOGLE_MAPS_API_KEY=created-key\n')
    await expect(
      readFile(join(temporaryDirectory, '.gitignore'), 'utf8'),
    ).resolves.toBe('.env\n')
  })

  it('replaces an existing key and preserves other .env entries', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      ['FOO=bar', 'GOOGLE_MAPS_API_KEY=old-key', 'BAR=baz', ''].join('\n'),
      'utf8',
    )
    await writeFile(join(temporaryDirectory, '.gitignore'), '.env\n', 'utf8')

    await saveGoogleMapsApiKey(filePath, 'updated-key')

    await expect(
      readFile(join(temporaryDirectory, '.env'), 'utf8'),
    ).resolves.toBe(
      ['FOO=bar', 'GOOGLE_MAPS_API_KEY=updated-key', 'BAR=baz', ''].join('\n'),
    )
    await expect(
      readFile(join(temporaryDirectory, '.gitignore'), 'utf8'),
    ).resolves.toBe('.env\n')
  })

  it('appends .env to an existing local .gitignore file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.gitignore'),
      'node_modules/\n',
      'utf8',
    )

    await saveGoogleMapsApiKey(filePath, 'created-key')

    await expect(
      readFile(join(temporaryDirectory, '.gitignore'), 'utf8'),
    ).resolves.toBe(['node_modules/', '.env', ''].join('\n'))
  })

  it('rethrows unexpected file read errors', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await mkdir(join(temporaryDirectory, '.env'))

    await expect(
      saveGoogleMapsApiKey(filePath, 'created-key'),
    ).rejects.toBeInstanceOf(Error)
  })
})
