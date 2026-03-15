import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  ResolutionCacheSyntaxError,
  loadResolutionCache,
} from '../../resolvers/load-resolution-cache'

let temporaryDirectories: string[] = []

async function createTemporaryDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-resolver-'))

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('loadResolutionCache', () => {
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
    let filePath = join(temporaryDirectory, 'missing-cache.json')

    await expect(loadResolutionCache(filePath)).resolves.toEqual({
      addresses: {},
      version: 1,
    })
  })

  it('rethrows unexpected filesystem read errors', async () => {
    let temporaryDirectory = await createTemporaryDirectory()

    await expect(loadResolutionCache(temporaryDirectory)).rejects.toMatchObject(
      {
        code: 'EISDIR',
      },
    )
  })

  it('loads a valid cache file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'cache.json')

    await writeFile(
      filePath,
      JSON.stringify({
        addresses: {
          'Senso-ji, Tokyo': [35.7148, 139.7967],
        },
        version: 1,
      }),
      'utf8',
    )

    await expect(loadResolutionCache(filePath)).resolves.toEqual({
      addresses: {
        'Senso-ji, Tokyo': [35.7148, 139.7967],
      },
      version: 1,
    })
  })

  it('throws ResolutionCacheSyntaxError for invalid JSON', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'cache.json')

    await writeFile(filePath, '{broken json', 'utf8')

    await expect(loadResolutionCache(filePath)).rejects.toBeInstanceOf(
      ResolutionCacheSyntaxError,
    )
  })

  it('throws ResolutionCacheValidationError for invalid cache data', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'cache.json')

    await writeFile(
      filePath,
      JSON.stringify({
        addresses: {
          'Senso-ji, Tokyo': ['north', 'east'],
        },
        version: 1,
      }),
      'utf8',
    )

    await expect(loadResolutionCache(filePath)).rejects.toMatchObject({
      issues: [
        'addresses.Senso-ji, Tokyo.0: Invalid input: expected number, received string',
        'addresses.Senso-ji, Tokyo.1: Invalid input: expected number, received string',
      ],
      message: 'Resolution cache validation failed',
      name: 'ResolutionCacheValidationError',
    })
  })

  it('formats root-level validation issues for cache files', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, 'cache.json')

    await writeFile(
      filePath,
      JSON.stringify({
        updatedAt: '2026-03-15',
        addresses: {},
        version: 1,
      }),
      'utf8',
    )

    await expect(loadResolutionCache(filePath)).rejects.toMatchObject({
      issues: ['root: Unrecognized key: "updatedAt"'],
      message: 'Resolution cache validation failed',
      name: 'ResolutionCacheValidationError',
    })
  })
})
