import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadResolutionCache } from '../../resolvers/load-resolution-cache'
import { saveResolutionCache } from '../../resolvers/save-resolution-cache'
import { mapConfigSchema } from '../../schema/map-config-schema'
import { resolveConfig } from '../../resolvers/resolve-config'

let temporaryDirectories: string[] = []
let fetchMock = vi.fn<typeof fetch>()
let originalFetch = globalThis.fetch

async function createTemporaryDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-resolve-'))

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('resolveConfig', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
    globalThis.fetch = originalFetch
  })

  it('keeps explicit coords and resolves address-only pins from cache', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let cachePath = join(temporaryDirectory, 'cache.json')

    await saveResolutionCache(
      {
        addresses: {
          'Senso-ji, Tokyo': [35.7148, 139.7967],
        },
        version: 1,
      },
      cachePath,
    )

    let config = mapConfigSchema.parse({
      pins: [
        {
          coords: [35.6812, 139.7671],
          title: 'Tokyo Station',
          id: 'tokyo-station',
        },
        {
          address: 'Senso-ji, Tokyo',
          title: 'Senso-ji',
          id: 'senso-ji',
        },
      ],
      map: {
        title: 'Tokyo',
      },
    })

    await expect(resolveConfig(config, { cachePath })).resolves.toEqual({
      pins: [
        {
          coords: [35.6812, 139.7671],
          title: 'Tokyo Station',
          id: 'tokyo-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
        {
          coords: [35.7148, 139.7967],
          address: 'Senso-ji, Tokyo',
          icon: 'shapes-pin',
          title: 'Senso-ji',
          color: 'red-500',
          id: 'senso-ji',
        },
      ],
      map: {
        title: 'Tokyo',
      },
      layers: [],
    })
  })

  it('prefers explicit coords when a pin has both coords and address', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let cachePath = join(temporaryDirectory, 'cache.json')

    await saveResolutionCache(
      {
        addresses: {
          'Tokyo Station, Tokyo': [1, 2],
        },
        version: 1,
      },
      cachePath,
    )

    let config = mapConfigSchema.parse({
      pins: [
        {
          address: 'Tokyo Station, Tokyo',
          coords: [35.6812, 139.7671],
          title: 'Tokyo Station',
          id: 'tokyo-station',
        },
      ],
      map: {
        title: 'Tokyo',
      },
    })

    await expect(resolveConfig(config, { cachePath })).resolves.toMatchObject({
      pins: [
        {
          coords: [35.6812, 139.7671],
        },
      ],
    })
  })

  it('resolves uncached addresses with Google and saves them to the cache', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let cachePath = join(temporaryDirectory, 'cache.json')
    let config = mapConfigSchema.parse({
      pins: [
        {
          address: 'Senso-ji, Tokyo',
          title: 'Senso-ji',
          id: 'senso-ji',
        },
      ],
      map: {
        title: 'Tokyo',
      },
    })

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              geometry: {
                location: {
                  lng: 139.7967,
                  lat: 35.7148,
                },
              },
            },
          ],
          status: 'OK',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      resolveConfig(config, {
        googleMapsApiKey: 'test-key',
        cachePath,
      }),
    ).resolves.toMatchObject({
      pins: [
        {
          coords: [35.7148, 139.7967],
          address: 'Senso-ji, Tokyo',
          id: 'senso-ji',
        },
      ],
    })

    await expect(loadResolutionCache(cachePath)).resolves.toEqual({
      addresses: {
        'Senso-ji, Tokyo': [35.7148, 139.7967],
      },
      version: 1,
    })
  })

  it('throws a helpful error when uncached addresses exist and the API key is missing', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let cachePath = join(temporaryDirectory, 'cache.json')
    let config = mapConfigSchema.parse({
      pins: [
        {
          address: 'Missing Place, Tokyo',
          title: 'Missing Place',
          id: 'missing-place',
        },
      ],
      map: {
        title: 'Tokyo',
      },
    })

    await expect(resolveConfig(config, { cachePath })).rejects.toMatchObject({
      message:
        'Pins with addresses require the GOOGLE_MAPS_API_KEY environment variable when coordinates are missing from the cache.',
      name: 'GoogleMapsApiKeyMissingError',
    })
  })

  it('throws LocationResolutionError for unresolved addresses', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let cachePath = join(temporaryDirectory, 'cache.json')
    let config = mapConfigSchema.parse({
      pins: [
        {
          address: 'Missing Place, Tokyo',
          title: 'Missing Place',
          id: 'missing-place',
        },
      ],
      map: {
        title: 'Tokyo',
      },
    })

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'ZERO_RESULTS',
          results: [],
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      resolveConfig(config, {
        googleMapsApiKey: 'test-key',
        cachePath,
      }),
    ).rejects.toMatchObject({
      unresolvedLocations: [
        {
          address: 'Missing Place, Tokyo',
          pinId: 'missing-place',
        },
      ],
      message: 'Location resolution failed',
      name: 'LocationResolutionError',
    })
  })
})
