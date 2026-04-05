import { writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadPhotoUploadCache } from '../../resolvers/load-photo-upload-cache'

let temporaryDirectories: string[] = []

async function createTemporaryDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-photo-cache-'))

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('loadPhotoUploadCache', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
  })

  it('returns an empty cache when the file does not exist', async () => {
    let temporaryDirectory = await createTemporaryDirectory()

    await expect(
      loadPhotoUploadCache(join(temporaryDirectory, 'photo-cache.json')),
    ).resolves.toEqual({
      entries: {},
      version: 1,
    })
  })

  it('loads a valid photo upload cache file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'photo-cache.json')

    await writeFile(
      filePath,
      JSON.stringify({
        entries: {
          '/tmp/kyoto.jpg': {
            publicUrl: 'https://example.com/photo.jpg',
            fileId: 'drive-file-id',
            hash: 'sha256-hash',
          },
        },
        version: 1,
      }),
      'utf8',
    )

    await expect(loadPhotoUploadCache(filePath)).resolves.toEqual({
      entries: {
        '/tmp/kyoto.jpg': {
          publicUrl: 'https://example.com/photo.jpg',
          fileId: 'drive-file-id',
          hash: 'sha256-hash',
        },
      },
      version: 1,
    })
  })

  it('throws a syntax error when the cache contains invalid JSON', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'photo-cache.json')

    await writeFile(filePath, '{broken', 'utf8')

    await expect(loadPhotoUploadCache(filePath)).rejects.toMatchObject({
      name: 'PhotoUploadCacheSyntaxError',
      message: 'Invalid JSON',
    })
  })

  it('throws a validation error when the cache shape is invalid', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'photo-cache.json')

    await writeFile(
      filePath,
      JSON.stringify({
        entries: {
          '/tmp/kyoto.jpg': {
            hash: 'sha256-hash',
          },
        },
        version: 1,
      }),
      'utf8',
    )

    let loadError: unknown = null

    try {
      await loadPhotoUploadCache(filePath)
    } catch (error) {
      loadError = error
    }

    expect(loadError).toBeInstanceOf(Error)

    let validationError = loadError as {
      issues?: unknown
      name?: unknown
    }

    expect(validationError.name).toBe('PhotoUploadCacheValidationError')
    expect(validationError.issues).toEqual(
      expect.arrayContaining([
        'entries./tmp/kyoto.jpg.fileId: Invalid input: expected string, received undefined',
        'entries./tmp/kyoto.jpg.publicUrl: Invalid input: expected string, received undefined',
      ]),
    )
  })

  it('rethrows unexpected cache read errors', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'photo-cache.json')

    await mkdir(filePath)

    await expect(loadPhotoUploadCache(filePath)).rejects.toBeInstanceOf(Error)
  })
})
