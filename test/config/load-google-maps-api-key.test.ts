import { writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadGoogleMapsApiKey } from '../../config/load-google-maps-api-key'

let temporaryDirectories: string[] = []

async function createTemporaryConfigDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-api-key-'))

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('loadGoogleMapsApiKey', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
    delete process.env['GOOGLE_MAPS_API_KEY']
  })

  it('prefers the process environment over the local .env file', async () => {
    let temporaryDirectory = await createTemporaryConfigDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    process.env['GOOGLE_MAPS_API_KEY'] = 'environment-key'

    await writeFile(
      join(temporaryDirectory, '.env'),
      'GOOGLE_MAPS_API_KEY=file-key\n',
      'utf8',
    )

    await expect(loadGoogleMapsApiKey(filePath)).resolves.toBe(
      'environment-key',
    )
  })

  it('loads the Google Maps API key from a local .env file', async () => {
    let temporaryDirectory = await createTemporaryConfigDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      'GOOGLE_MAPS_API_KEY=file-key\n',
      'utf8',
    )

    await expect(loadGoogleMapsApiKey(filePath)).resolves.toBe('file-key')
  })

  it('strips quotes and export syntax from a local .env file', async () => {
    let temporaryDirectory = await createTemporaryConfigDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      'export GOOGLE_MAPS_API_KEY="quoted-key"\n',
      'utf8',
    )

    await expect(loadGoogleMapsApiKey(filePath)).resolves.toBe('quoted-key')
  })

  it('loads a single-quoted Google Maps API key from a local .env file', async () => {
    let temporaryDirectory = await createTemporaryConfigDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      "GOOGLE_MAPS_API_KEY='single-quoted-key'\n",
      'utf8',
    )

    await expect(loadGoogleMapsApiKey(filePath)).resolves.toBe(
      'single-quoted-key',
    )
  })

  it('skips unrelated .env lines until it finds the Google Maps API key', async () => {
    let temporaryDirectory = await createTemporaryConfigDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(
      join(temporaryDirectory, '.env'),
      ['FOO=bar', 'GOOGLE_MAPS_API_KEY=file-key', ''].join('\n'),
      'utf8',
    )

    await expect(loadGoogleMapsApiKey(filePath)).resolves.toBe('file-key')
  })

  it('returns null when the local .env file is missing or the key is blank', async () => {
    let temporaryDirectory = await createTemporaryConfigDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await expect(loadGoogleMapsApiKey(filePath)).resolves.toBeNull()

    await writeFile(
      join(temporaryDirectory, '.env'),
      'GOOGLE_MAPS_API_KEY=\n',
      'utf8',
    )

    await expect(loadGoogleMapsApiKey(filePath)).resolves.toBeNull()
  })

  it('returns null when the local .env file does not contain the Google Maps API key', async () => {
    let temporaryDirectory = await createTemporaryConfigDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await writeFile(join(temporaryDirectory, '.env'), 'FOO=bar\n', 'utf8')

    await expect(loadGoogleMapsApiKey(filePath)).resolves.toBeNull()
  })

  it('rethrows unexpected .env read errors', async () => {
    let temporaryDirectory = await createTemporaryConfigDirectory()
    let filePath = join(temporaryDirectory, 'index.yaml')

    await mkdir(join(temporaryDirectory, '.env'))

    await expect(loadGoogleMapsApiKey(filePath)).rejects.toBeInstanceOf(Error)
  })
})
