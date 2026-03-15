import { afterEach, describe, expect, it } from 'vitest'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadResolutionCache } from '../../resolvers/load-resolution-cache'
import { saveResolutionCache } from '../../resolvers/save-resolution-cache'

let temporaryDirectories: string[] = []

async function createTemporaryDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-resolver-'))

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('saveResolutionCache', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
  })

  it('saves a cache file as pretty JSON and can load it again', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let filePath = join(temporaryDirectory, '.pinbook', 'cache.json')

    await saveResolutionCache(
      {
        addresses: {
          'Tokyo Station, Tokyo': [35.6812, 139.7671],
        },
        version: 1,
      },
      filePath,
    )

    await expect(readFile(filePath, 'utf8')).resolves.toBe(
      '{\n' +
        '  "addresses": {\n' +
        '    "Tokyo Station, Tokyo": [\n' +
        '      35.6812,\n' +
        '      139.7671\n' +
        '    ]\n' +
        '  },\n' +
        '  "version": 1\n' +
        '}\n',
    )

    await expect(loadResolutionCache(filePath)).resolves.toEqual({
      addresses: {
        'Tokyo Station, Tokyo': [35.6812, 139.7671],
      },
      version: 1,
    })
  })
})
