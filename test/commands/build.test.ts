import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { writeFile, mkdir } from 'node:fs/promises'
import { cancel, log } from '@clack/prompts'
import { join } from 'node:path'

import type { ResolvedMapConfig } from '../../types/resolved-map-config'
import type { MapConfigSchema } from '../../schema/map-config-schema'

import {
  LocationResolutionError,
  resolveConfig,
} from '../../resolvers/resolve-config'
import { requestGoogleMapsApiKey } from '../../cli/request-google-maps-api-key'
import { saveGoogleMapsApiKey } from '../../config/save-google-maps-api-key'
import { loadGoogleMapsApiKey } from '../../config/load-google-maps-api-key'
import { exportKml } from '../../serializers/export-kml'
import { loadConfig } from '../../config/load-config'
import { build } from '../../commands/build'

let originalStdinIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')
let originalStdoutIsTTY = Object.getOwnPropertyDescriptor(
  process.stdout,
  'isTTY',
)

vi.mock('@clack/prompts', () => ({
  log: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  cancel: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}))

vi.mock('../../config/load-config', () => ({
  loadConfig: vi.fn(),
}))

vi.mock('../../config/load-google-maps-api-key', () => ({
  loadGoogleMapsApiKey: vi.fn(),
}))

vi.mock('../../config/save-google-maps-api-key', () => ({
  saveGoogleMapsApiKey: vi.fn(),
}))

vi.mock('../../cli/request-google-maps-api-key', () => ({
  requestGoogleMapsApiKey: vi.fn(),
}))

vi.mock('../../serializers/export-kml', () => ({
  exportKml: vi.fn(),
}))

vi.mock('../../resolvers/resolve-config', () => {
  class MockLocationResolutionError extends Error {
    public unresolvedLocations: {
      address: string
      pinId: string
    }[]

    public constructor(
      unresolvedLocations: {
        address: string
        pinId: string
      }[],
    ) {
      super('Location resolution failed')
      this.name = 'MockLocationResolutionError'
      this.unresolvedLocations = unresolvedLocations
    }
  }

  return {
    LocationResolutionError: MockLocationResolutionError,
    resolveConfig: vi.fn(),
  }
})

let exampleDirectoryPath = 'example'
let exampleConfigFilePath = join(exampleDirectoryPath, 'index.yaml')
let exampleBuildOutputDirectoryPath = join(exampleDirectoryPath, '.pinbook')
let exampleBuildOutputPath = join(exampleBuildOutputDirectoryPath, 'map.kml')
let exampleEnvironmentPath = join(exampleDirectoryPath, '.env')
let exampleResolutionCachePath = join(
  exampleDirectoryPath,
  'node_modules',
  '.cache',
  'pinbook',
  'cache.json',
)

function restoreInteractiveTerminal(): void {
  if (originalStdinIsTTY) {
    Object.defineProperty(process.stdin, 'isTTY', originalStdinIsTTY)
  } else {
    Reflect.deleteProperty(process.stdin, 'isTTY')
  }

  if (originalStdoutIsTTY) {
    Object.defineProperty(process.stdout, 'isTTY', originalStdoutIsTTY)
  } else {
    Reflect.deleteProperty(process.stdout, 'isTTY')
  }
}

function createGoogleGeocodingError(
  message: string,
  options: {
    isInvalidApiKey?: boolean
  } = {},
): Error {
  let error = new Error(message) as {
    isInvalidApiKey?: boolean
  } & Error

  error.name = 'GoogleGeocodingError'

  if ('isInvalidApiKey' in options) {
    error.isInvalidApiKey = options.isInvalidApiKey
  }

  return error
}

function createResolutionCacheValidationError(
  issues: string[],
): { issues: string[] } & Error {
  let error = new Error('Resolution cache validation failed') as {
    issues: string[]
  } & Error

  error.name = 'ResolutionCacheValidationError'
  error.issues = issues

  return error
}

function setInteractiveTerminal(isInteractive: boolean): void {
  Object.defineProperty(process.stdin, 'isTTY', {
    value: isInteractive,
    configurable: true,
  })
  Object.defineProperty(process.stdout, 'isTTY', {
    value: isInteractive,
    configurable: true,
  })
}

function createConfigValidationError(
  issues: string[],
): { issues: string[] } & Error {
  let error = new Error('Config validation failed') as {
    issues: string[]
  } & Error

  error.name = 'ConfigValidationError'
  error.issues = issues

  return error
}

function createLocationResolutionError(
  unresolvedLocations: {
    address: string
    pinId: string
  }[],
): LocationResolutionError {
  return new LocationResolutionError(unresolvedLocations)
}

function createResolutionCacheSyntaxError(message: string): Error {
  let error = new Error(message)

  error.name = 'ResolutionCacheSyntaxError'

  return error
}

function createConfigSyntaxError(message: string): Error {
  let error = new Error(message)

  error.name = 'ConfigSyntaxError'

  return error
}

describe('build', () => {
  beforeEach(() => {
    process.exitCode = undefined
    vi.clearAllMocks()
    setInteractiveTerminal(true)
  })

  afterEach(() => {
    delete process.env['GOOGLE_MAPS_API_KEY']
    restoreInteractiveTerminal()
  })

  it('writes the generated KML artifact for a valid config', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
          coords: [35.0116, 135.7681],
          icon: 'shapes-pin' as const,
          color: 'red-500' as const,
          title: 'Kyoto Station',
          id: 'kyoto-station',
        },
      ],
      map: {
        title: 'Kyoto 2026',
      },
      layers: [],
    }
    let resolvedConfig: ResolvedMapConfig = {
      ...config,
      pins: [
        {
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
    }

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
    vi.mocked(resolveConfig).mockResolvedValueOnce(resolvedConfig)
    vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')

    await build(filePath)

    expect(loadConfig).toHaveBeenCalledWith(filePath)
    expect(resolveConfig).toHaveBeenCalledWith(config, {
      cachePath: exampleResolutionCachePath,
      googleMapsApiKey: 'test-key',
    })
    expect(exportKml).toHaveBeenCalledWith(resolvedConfig, {
      documentDescription: true,
    })
    expect(mkdir).toHaveBeenCalledWith(exampleBuildOutputDirectoryPath, {
      recursive: true,
    })
    expect(writeFile).toHaveBeenCalledWith(
      exampleBuildOutputPath,
      '<kml>map</kml>',
      'utf8',
    )
    expect(log.success).toHaveBeenCalledWith(
      `Map written to ${exampleBuildOutputPath}.`,
    )
    expect(process.exitCode).toBeUndefined()
  })

  it('treats a directory target path as a project directory with index.yaml', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
          coords: [35.0116, 135.7681],
          icon: 'shapes-pin' as const,
          color: 'red-500' as const,
          title: 'Kyoto Station',
          id: 'kyoto-station',
        },
      ],
      map: {
        title: 'Kyoto 2026',
      },
      layers: [],
    }
    let resolvedConfig: ResolvedMapConfig = {
      ...config,
      pins: [
        {
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
    }

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
    vi.mocked(resolveConfig).mockResolvedValueOnce(resolvedConfig)
    vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')

    await build(exampleDirectoryPath)

    expect(loadConfig).toHaveBeenCalledWith(filePath)
  })

  it('uses index.yaml in the current directory when build target path is omitted', async () => {
    let config: MapConfigSchema = {
      pins: [
        {
          coords: [35.0116, 135.7681],
          icon: 'shapes-pin' as const,
          color: 'red-500' as const,
          title: 'Kyoto Station',
          id: 'kyoto-station',
        },
      ],
      map: {
        title: 'Kyoto 2026',
      },
      layers: [],
    }
    let resolvedConfig: ResolvedMapConfig = {
      ...config,
      pins: [
        {
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
    }

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
    vi.mocked(resolveConfig).mockResolvedValueOnce(resolvedConfig)
    vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')

    await build()

    expect(loadConfig).toHaveBeenCalledWith('index.yaml')
  })

  it('prompts for a missing Google Maps API key, saves it, and retries the build', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
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
    }
    let missingApiKeyError = new Error(
      'Pins with addresses require the GOOGLE_MAPS_API_KEY environment variable when coordinates are missing from the cache.',
    )
    let resolvedConfig: ResolvedMapConfig = {
      ...config,
      pins: [
        {
          coords: [35.7148, 139.7967],
          address: 'Senso-ji, Tokyo',
          icon: 'shapes-pin',
          title: 'Senso-ji',
          color: 'red-500',
          id: 'senso-ji',
        },
      ],
    }

    missingApiKeyError.name = 'GoogleMapsApiKeyMissingError'

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce(null)
    vi.mocked(resolveConfig)
      .mockRejectedValueOnce(missingApiKeyError)
      .mockResolvedValueOnce(resolvedConfig)
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce('prompted-key')
    vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')

    await build(filePath)

    expect(resolveConfig).toHaveBeenNthCalledWith(1, config, {
      cachePath: exampleResolutionCachePath,
    })
    expect(requestGoogleMapsApiKey).toHaveBeenCalledWith('missing')
    expect(saveGoogleMapsApiKey).toHaveBeenCalledWith(filePath, 'prompted-key')
    expect(resolveConfig).toHaveBeenNthCalledWith(2, config, {
      cachePath: exampleResolutionCachePath,
      googleMapsApiKey: 'prompted-key',
    })
    expect(process.env['GOOGLE_MAPS_API_KEY']).toBe('prompted-key')
    expect(process.exitCode).toBeUndefined()
  })

  it('cancels the build when the Google Maps API key prompt is canceled', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
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
    }
    let missingApiKeyError = new Error(
      'Pins with addresses require the GOOGLE_MAPS_API_KEY environment variable when coordinates are missing from the cache.',
    )

    missingApiKeyError.name = 'GoogleMapsApiKeyMissingError'

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce(null)
    vi.mocked(resolveConfig).mockRejectedValueOnce(missingApiKeyError)
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce(null)

    await build(filePath)

    expect(cancel).toHaveBeenCalledWith('Build canceled.')
    expect(saveGoogleMapsApiKey).not.toHaveBeenCalled()
    expect(exportKml).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('does not prompt for a missing Google Maps API key in non-interactive mode', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
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
    }
    let missingApiKeyError = new Error(
      'Pins with addresses require the GOOGLE_MAPS_API_KEY environment variable when coordinates are missing from the cache.',
    )

    missingApiKeyError.name = 'GoogleMapsApiKeyMissingError'

    setInteractiveTerminal(false)
    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce(null)
    vi.mocked(resolveConfig).mockRejectedValueOnce(missingApiKeyError)

    await build(filePath)

    expect(requestGoogleMapsApiKey).not.toHaveBeenCalled()
    expect(saveGoogleMapsApiKey).not.toHaveBeenCalled()
    expect(log.error).toHaveBeenCalledWith(
      `Google Maps API key is required to geocode uncached addresses. Set GOOGLE_MAPS_API_KEY or add it to ${exampleEnvironmentPath}.`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('prompts for a replacement Google Maps API key when a saved key is invalid', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
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
    }
    let resolvedConfig: ResolvedMapConfig = {
      ...config,
      pins: [
        {
          coords: [35.7148, 139.7967],
          address: 'Senso-ji, Tokyo',
          icon: 'shapes-pin',
          title: 'Senso-ji',
          color: 'red-500',
          id: 'senso-ji',
        },
      ],
    }

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('saved-invalid-key')
    vi.mocked(resolveConfig)
      .mockRejectedValueOnce(
        createGoogleGeocodingError(
          'Google returned status REQUEST_DENIED. The provided API key is invalid.',
          {
            isInvalidApiKey: true,
          },
        ),
      )
      .mockResolvedValueOnce(resolvedConfig)
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce('replacement-key')
    vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')

    await build(filePath)

    expect(requestGoogleMapsApiKey).toHaveBeenCalledWith('invalid')
    expect(saveGoogleMapsApiKey).toHaveBeenCalledWith(
      filePath,
      'replacement-key',
    )
    expect(resolveConfig).toHaveBeenNthCalledWith(2, config, {
      cachePath: exampleResolutionCachePath,
      googleMapsApiKey: 'replacement-key',
    })
    expect(process.env['GOOGLE_MAPS_API_KEY']).toBe('replacement-key')
    expect(process.exitCode).toBeUndefined()
  })

  it('cancels the build when replacement Google Maps API key prompt is canceled', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
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
    }

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('saved-invalid-key')
    vi.mocked(resolveConfig).mockRejectedValueOnce(
      createGoogleGeocodingError(
        'Google returned status REQUEST_DENIED. The provided API key is invalid.',
        {
          isInvalidApiKey: true,
        },
      ),
    )
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce(null)

    await build(filePath)

    expect(requestGoogleMapsApiKey).toHaveBeenCalledWith('invalid')
    expect(cancel).toHaveBeenCalledWith('Build canceled.')
    expect(saveGoogleMapsApiKey).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('does not prompt for a replacement Google Maps API key in non-interactive mode', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
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
    }

    setInteractiveTerminal(false)
    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('saved-invalid-key')
    vi.mocked(resolveConfig).mockRejectedValueOnce(
      createGoogleGeocodingError(
        'Google returned status REQUEST_DENIED. The provided API key is invalid.',
        {
          isInvalidApiKey: true,
        },
      ),
    )

    await build(filePath)

    expect(requestGoogleMapsApiKey).not.toHaveBeenCalled()
    expect(saveGoogleMapsApiKey).not.toHaveBeenCalled()
    expect(log.error).toHaveBeenCalledWith(
      `Google Maps API key was rejected. Update GOOGLE_MAPS_API_KEY or ${exampleEnvironmentPath} and run build again.`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs formatted issues for an invalid config', async () => {
    vi.mocked(loadConfig).mockRejectedValueOnce(
      createConfigValidationError([
        'pins.0.coords: Invalid input: expected tuple, received undefined',
        'root: Unrecognized key: "version"',
      ]),
    )

    await build('index.yaml')

    expect(resolveConfig).not.toHaveBeenCalled()
    expect(exportKml).not.toHaveBeenCalled()
    expect(writeFile).not.toHaveBeenCalled()
    expect(log.error).toHaveBeenNthCalledWith(1, 'Config is invalid.\n')
    expect(log.error).toHaveBeenNthCalledWith(
      2,
      '- pins.0.coords: Invalid input: expected tuple, received undefined',
    )
    expect(log.error).toHaveBeenNthCalledWith(
      3,
      '- root: Unrecognized key: "version"',
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs YAML syntax errors', async () => {
    let filePath = exampleConfigFilePath

    vi.mocked(loadConfig).mockRejectedValueOnce(
      createConfigSyntaxError('Missing ] at line 4, column 1'),
    )

    await build(filePath)

    expect(resolveConfig).not.toHaveBeenCalled()
    expect(exportKml).not.toHaveBeenCalled()
    expect(writeFile).not.toHaveBeenCalled()
    expect(log.error).toHaveBeenCalledWith(
      'Invalid YAML: Missing ] at line 4, column 1',
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs resolution cache syntax errors', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
      map: {
        title: 'Kyoto 2026',
      },
      layers: [],
    }
    let resolutionCachePath = exampleResolutionCachePath

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce(null)
    vi.mocked(resolveConfig).mockRejectedValueOnce(
      createResolutionCacheSyntaxError('Invalid JSON'),
    )

    await build(filePath)

    expect(log.error).toHaveBeenNthCalledWith(
      1,
      `Resolution cache is invalid JSON: ${resolutionCachePath}`,
    )
    expect(log.error).toHaveBeenNthCalledWith(
      2,
      `Fix or delete ${resolutionCachePath} and run build again.`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs resolution cache validation issues', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
      map: {
        title: 'Kyoto 2026',
      },
      layers: [],
    }
    let resolutionCachePath = exampleResolutionCachePath

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce(null)
    vi.mocked(resolveConfig).mockRejectedValueOnce(
      createResolutionCacheValidationError([
        'addresses.Senso-ji, Tokyo.0: Invalid input: expected number, received string',
      ]),
    )

    await build(filePath)

    expect(log.error).toHaveBeenNthCalledWith(
      1,
      'Resolution cache is invalid.\n',
    )
    expect(log.error).toHaveBeenNthCalledWith(
      2,
      '- addresses.Senso-ji, Tokyo.0: Invalid input: expected number, received string',
    )
    expect(log.error).toHaveBeenNthCalledWith(
      3,
      `Fix or delete ${resolutionCachePath} and run build again.`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs missing config file errors without throwing a stack trace', async () => {
    let error = Object.assign(
      new Error("ENOENT: no such file or directory, open 'pinTest/index.yaml'"),
      {
        code: 'ENOENT',
      },
    )

    vi.mocked(loadConfig).mockRejectedValueOnce(error)

    await build('pinTest')

    expect(log.error).toHaveBeenCalledWith(
      `Config file not found: ${join('pinTest', 'index.yaml')}`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs unresolved addresses when they are missing from the cache', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
          address: 'Missing Place, Tokyo',
          title: 'Missing Place',
          id: 'missing-place',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
      map: {
        title: 'Tokyo',
      },
      layers: [],
    }

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce(null)
    vi.mocked(resolveConfig).mockRejectedValueOnce(
      createLocationResolutionError([
        {
          address: 'Missing Place, Tokyo',
          pinId: 'missing-place',
        },
      ]),
    )

    await build(filePath)

    expect(exportKml).not.toHaveBeenCalled()
    expect(writeFile).not.toHaveBeenCalled()
    expect(log.error).toHaveBeenNthCalledWith(
      1,
      'Unresolved addresses were found.\n',
    )
    expect(log.error).toHaveBeenNthCalledWith(
      2,
      '- missing-place: Missing Place, Tokyo',
    )
    expect(log.error).toHaveBeenNthCalledWith(
      3,
      `Add them to ${exampleResolutionCachePath} and run build again.`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs Google geocoding failures', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
          address: 'Missing Place, Tokyo',
          title: 'Missing Place',
          id: 'missing-place',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
      map: {
        title: 'Tokyo',
      },
      layers: [],
    }
    let error = createGoogleGeocodingError(
      'Google returned status OVER_QUERY_LIMIT.',
      {
        isInvalidApiKey: false,
      },
    )

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
    vi.mocked(resolveConfig).mockRejectedValueOnce(error)

    await build(filePath)

    expect(log.error).toHaveBeenCalledWith(
      `Google geocoding failed: ${error.message}`,
    )
    expect(requestGoogleMapsApiKey).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('does not prompt more than once when the replacement Google Maps API key is also invalid', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
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
    }
    let invalidApiKeyError = createGoogleGeocodingError(
      'Google returned status REQUEST_DENIED. The provided API key is invalid.',
      {
        isInvalidApiKey: true,
      },
    )

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('saved-invalid-key')
    vi.mocked(resolveConfig)
      .mockRejectedValueOnce(invalidApiKeyError)
      .mockRejectedValueOnce(invalidApiKeyError)
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce('replacement-key')

    await build(filePath)

    expect(requestGoogleMapsApiKey).toHaveBeenCalledOnce()
    expect(log.error).toHaveBeenCalledWith(
      `Google geocoding failed: ${invalidApiKeyError.message}`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('rethrows unexpected errors', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
      map: {
        title: 'Kyoto 2026',
      },
      layers: [],
    }

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
    vi.mocked(resolveConfig).mockRejectedValueOnce(new Error('boom'))

    await expect(build(filePath)).rejects.toThrow('boom')
  })

  it('rethrows unexpected non-Error values', async () => {
    let filePath = exampleConfigFilePath
    let config: MapConfigSchema = {
      pins: [
        {
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
      map: {
        title: 'Kyoto 2026',
      },
      layers: [],
    }

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
    vi.mocked(resolveConfig).mockRejectedValueOnce('boom')

    await expect(build(filePath)).rejects.toBe('boom')
  })
})
