import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createTemporaryDirectory } from '../helpers/create-temporary-directory'
import { loadResolutionCache } from '../../resolvers/load-resolution-cache'
import { saveResolutionCache } from '../../resolvers/save-resolution-cache'

describe('saveResolutionCache', () => {
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
