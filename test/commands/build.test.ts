import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { progress, cancel, log } from '@clack/prompts'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { ResolvedMapConfig } from '../../types/resolved-map-config'
import type { MapConfigSchema } from '../../schema/map-config-schema'

import {
  PhotoUploadCacheValidationError,
  PhotoUploadCacheSyntaxError,
} from '../../resolvers/load-photo-upload-cache'
import { LocalPhotoFileNotFoundError } from '../../resolvers/local-photo-file-not-found-error'
import { GoogleDrivePhotoUploadError } from '../../resolvers/google-drive-photo-upload-error'
import {
  LocationResolutionError,
  resolveConfig,
} from '../../resolvers/resolve-config'
import { LocalPhotoProcessingError } from '../../resolvers/local-photo-processing-error'
import { resolveGoogleDrivePhotos } from '../../resolvers/resolve-google-drive-photos'
import { GoogleDriveConfigError } from '../../resolvers/google-drive-config-error'
import { requestGoogleMapsApiKey } from '../../cli/request-google-maps-api-key'
import { loadGoogleDriveConfig } from '../../config/load-google-drive-config'
import { saveGoogleMapsApiKey } from '../../config/save-google-maps-api-key'
import { loadGoogleMapsApiKey } from '../../config/load-google-maps-api-key'
import { isInteractiveTerminal } from '../../cli/is-interactive-terminal'
import { exportKml } from '../../serializers/export-kml'
import { loadConfig } from '../../config/load-config'
import { build } from '../../commands/build'

vi.mock('@clack/prompts', () => ({
  log: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    step: vi.fn(),
    warn: vi.fn(),
  },
  progress: vi.fn(),
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

vi.mock('../../config/load-google-drive-config', () => ({
  loadGoogleDriveConfig: vi.fn(),
}))

vi.mock('../../config/save-google-maps-api-key', () => ({
  saveGoogleMapsApiKey: vi.fn(),
}))

vi.mock('../../cli/request-google-maps-api-key', () => ({
  requestGoogleMapsApiKey: vi.fn(),
}))

vi.mock('../../cli/is-interactive-terminal', () => ({
  isInteractiveTerminal: vi.fn(),
}))

vi.mock('../../serializers/export-kml', () => ({
  exportKml: vi.fn(),
}))

vi.mock('../../resolvers/resolve-google-drive-photos', () => ({
  resolveGoogleDrivePhotos: vi.fn((config: ResolvedMapConfig) =>
    Promise.resolve(config),
  ),
}))

vi.mock('../../resolvers/google-drive-config-error', () => ({
  GoogleDriveConfigError: class MockGoogleDriveConfigError extends Error {
    public missingVariables: string[]

    public constructor(missingVariables: string[]) {
      super('Google Drive configuration is incomplete')
      this.name = 'GoogleDriveConfigError'
      this.missingVariables = missingVariables
    }
  },
}))

vi.mock('../../resolvers/local-photo-file-not-found-error', () => ({
  LocalPhotoFileNotFoundError: class MockLocalPhotoFileNotFoundError extends Error {
    public photoPath: string

    public constructor(photoPath: string) {
      super(`Local photo file not found: ${photoPath}`)
      this.name = 'LocalPhotoFileNotFoundError'
      this.photoPath = photoPath
    }
  },
}))

vi.mock('../../resolvers/google-drive-photo-upload-error', () => ({
  GoogleDrivePhotoUploadError: class MockGoogleDrivePhotoUploadError extends Error {
    public constructor(message: string) {
      super(message)
      this.name = 'GoogleDrivePhotoUploadError'
    }
  },
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
      options?: ErrorOptions,
    ) {
      super('Location resolution failed', options)
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
let examplePhotoUploadCachePath = join(
  exampleDirectoryPath,
  'node_modules',
  '.cache',
  'pinbook',
  'photo-cache.json',
)

class GoogleGeocodingError extends Error {
  public isInvalidApiKey?: boolean

  public constructor(
    message: string,
    options: {
      isInvalidApiKey?: boolean
    } & ErrorOptions = {},
  ) {
    super(message, options)
    this.name = 'GoogleGeocodingError'

    if ('isInvalidApiKey' in options) {
      this.isInvalidApiKey = options.isInvalidApiKey
    }
  }
}

class GoogleMapsApiKeyMissingError extends Error {
  public constructor(options?: ErrorOptions) {
    super(
      'Pins with addresses require the GOOGLE_MAPS_API_KEY environment variable when coordinates are missing from the cache.',
      options,
    )
    this.name = 'GoogleMapsApiKeyMissingError'
  }
}

class ResolutionCacheValidationError extends Error {
  public issues: string[]

  public constructor(issues: string[], options?: ErrorOptions) {
    super('Resolution cache validation failed', options)
    this.name = 'ResolutionCacheValidationError'
    this.issues = issues
  }
}

class ConfigValidationError extends Error {
  public issues: string[]

  public constructor(issues: string[], options?: ErrorOptions) {
    super('Config validation failed', options)
    this.name = 'ConfigValidationError'
    this.issues = issues
  }
}

class ResolutionCacheSyntaxError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ResolutionCacheSyntaxError'
  }
}

class ConfigSyntaxError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ConfigSyntaxError'
  }
}

function createProgressHandle(): ReturnType<typeof progress> {
  return {
    advance: vi.fn<(step?: number, message?: string) => void>(),
    message: vi.fn<(message?: string) => void>(),
    cancel: vi.fn<(message?: string) => void>(),
    start: vi.fn<(message?: string) => void>(),
    error: vi.fn<(message?: string) => void>(),
    stop: vi.fn<(message?: string) => void>(),
    clear: vi.fn<() => void>(),
    isCancelled: false,
  }
}

function mockSuccessfulBuild(
  config: MapConfigSchema = createKyotoStationConfig(),
  resolvedConfig: ResolvedMapConfig = createKyotoStationConfig(),
): void {
  vi.mocked(loadConfig).mockResolvedValueOnce(config)
  vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
  vi.mocked(resolveConfig).mockResolvedValueOnce(resolvedConfig)
  vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')
}

function createResolvedSensoJiConfig(): ResolvedMapConfig {
  return {
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
    map: {
      title: 'Tokyo',
    },
    layers: [],
  }
}

function mockGoogleDrivePhotosError(error: Error): void {
  vi.mocked(loadConfig).mockResolvedValueOnce(createEmptyConfig())
  vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce(null)
  vi.mocked(resolveConfig).mockResolvedValueOnce(createEmptyConfig())
  vi.mocked(resolveGoogleDrivePhotos).mockRejectedValueOnce(error)
}

function createKyotoStationConfig(): ResolvedMapConfig {
  return {
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
}

function createMissingPlaceConfig(): MapConfigSchema {
  return {
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
}

function createSensoJiConfig(): MapConfigSchema {
  return {
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
}

function createInvalidApiKeyError(): Error {
  return createGoogleGeocodingError(
    'Google returned status REQUEST_DENIED. The provided API key is invalid.',
    {
      isInvalidApiKey: true,
    },
  )
}

function createLocationResolutionError(
  unresolvedLocations: {
    address: string
    pinId: string
  }[],
): LocationResolutionError {
  return new LocationResolutionError(unresolvedLocations)
}

function createGoogleGeocodingError(
  message: string,
  options: {
    isInvalidApiKey?: boolean
  } = {},
): Error {
  return new GoogleGeocodingError(message, options)
}

function createPhotoUploadCacheValidationError(
  issues: string[],
): PhotoUploadCacheValidationError {
  return new PhotoUploadCacheValidationError(issues)
}

function createResolutionCacheValidationError(
  issues: string[],
): { issues: string[] } & Error {
  return new ResolutionCacheValidationError(issues)
}

function createEmptyConfig(): ResolvedMapConfig {
  return {
    map: {
      title: 'Kyoto 2026',
    },
    layers: [],
    pins: [],
  }
}

function createConfigValidationError(
  issues: string[],
): { issues: string[] } & Error {
  return new ConfigValidationError(issues)
}

function createResolutionCacheSyntaxError(message: string): Error {
  return new ResolutionCacheSyntaxError(message)
}

function createConfigSyntaxError(message: string): Error {
  return new ConfigSyntaxError(message)
}

describe('build', () => {
  beforeEach(() => {
    process.exitCode = undefined
    vi.clearAllMocks()
    vi.mocked(isInteractiveTerminal).mockReturnValue(true)
    vi.mocked(loadGoogleDriveConfig).mockResolvedValue({})
    vi.mocked(resolveGoogleDrivePhotos).mockImplementation(
      (config: ResolvedMapConfig) => Promise.resolve(config),
    )
    vi.mocked(progress).mockImplementation(() => createProgressHandle())
  })

  afterEach(() => {
    delete process.env['GOOGLE_MAPS_API_KEY']
  })

  it('writes the generated KML artifact for a valid config', async () => {
    let filePath = exampleConfigFilePath
    let config = createKyotoStationConfig()
    let resolvedConfig = createKyotoStationConfig()

    mockSuccessfulBuild(config, resolvedConfig)

    await build(filePath)

    expect(loadConfig).toHaveBeenCalledWith(filePath)
    expect(log.step).toHaveBeenCalledWith(`Building map from ${filePath}.`)
    expect(vi.mocked(resolveConfig).mock.calls[0]?.[0]).toBe(config)
    expect(vi.mocked(resolveConfig).mock.calls[0]?.[1]).toMatchObject({
      cachePath: exampleResolutionCachePath,
      googleMapsApiKey: 'test-key',
    })
    expect(typeof vi.mocked(resolveConfig).mock.calls[0]?.[1]?.onProgress).toBe(
      'function',
    )
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
    expect(log.step).toHaveBeenCalledWith(
      `Writing KML artifact to ${exampleBuildOutputPath}.`,
    )
    expect(log.success).toHaveBeenCalledWith(
      `Map written to ${exampleBuildOutputPath}.`,
    )
    expect(process.exitCode).toBeUndefined()
  })

  it('shows address resolution progress while uncached addresses are geocoded', async () => {
    let filePath = exampleConfigFilePath
    let resolvedConfig = createResolvedSensoJiConfig()
    let addressProgressHandle = createProgressHandle()

    vi.mocked(progress).mockImplementationOnce(() => addressProgressHandle)
    vi.mocked(loadConfig).mockResolvedValueOnce(createSensoJiConfig())
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
    vi.mocked(resolveConfig).mockImplementationOnce((_config, options) => {
      options?.onProgress?.({
        type: 'geocoding-start',
        total: 1,
      })
      options?.onProgress?.({
        type: 'geocoding-progress',
        address: 'Senso-ji, Tokyo',
        completed: 1,
        total: 1,
      })

      return Promise.resolve(resolvedConfig)
    })
    vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')

    await build(filePath)

    expect(progress).toHaveBeenCalledWith({
      max: 1,
    })
    expect(addressProgressHandle.start).toHaveBeenCalledWith(
      'Resolving 1 uncached address with Google Maps...',
    )
    expect(addressProgressHandle.advance).toHaveBeenCalledWith(
      1,
      'Resolved 1/1 address with Google Maps...',
    )
    expect(addressProgressHandle.stop).toHaveBeenCalledWith(
      'Address resolution complete.',
    )
  })

  it('shows Google Drive photo progress while local photos are processed', async () => {
    let filePath = exampleConfigFilePath
    let photoProgressHandle = createProgressHandle()

    vi.mocked(progress).mockImplementationOnce(() => photoProgressHandle)
    mockSuccessfulBuild()
    vi.mocked(resolveGoogleDrivePhotos).mockImplementationOnce(
      (resolved, options) => {
        options?.onProgress?.({
          type: 'start',
          completed: 0,
          uploaded: 0,
          cached: 0,
          total: 2,
        })
        options?.onProgress?.({
          type: 'drive-auth-start',
          completed: 0,
          uploaded: 0,
          cached: 0,
          total: 2,
        })
        options?.onProgress?.({
          type: 'drive-auth-complete',
          completed: 0,
          uploaded: 0,
          cached: 0,
          total: 2,
        })
        options?.onProgress?.({
          photoPath: '/tmp/kyoto.jpg',
          type: 'upload-start',
          completed: 0,
          uploaded: 0,
          cached: 0,
          total: 2,
        })
        options?.onProgress?.({
          photoPath: '/tmp/kyoto.jpg',
          type: 'upload-complete',
          completed: 1,
          uploaded: 1,
          cached: 0,
          total: 2,
        })
        options?.onProgress?.({
          photoPath: '/tmp/osaka.jpg',
          type: 'cache-hit',
          completed: 2,
          uploaded: 1,
          cached: 1,
          total: 2,
        })
        options?.onProgress?.({
          type: 'complete',
          completed: 2,
          uploaded: 1,
          cached: 1,
          total: 2,
        })

        return Promise.resolve(resolved)
      },
    )

    await build(filePath)

    expect(progress).toHaveBeenCalledWith({
      max: 2,
    })
    expect(photoProgressHandle.start).toHaveBeenCalledWith(
      'Processing 2 local photos...',
    )
    expect(photoProgressHandle.message).toHaveBeenNthCalledWith(
      1,
      'Authenticating with Google Drive... (0/2 ready)',
    )
    expect(photoProgressHandle.message).toHaveBeenNthCalledWith(
      2,
      'Google Drive ready. Uploading photos... (0/2 ready)',
    )
    expect(photoProgressHandle.message).toHaveBeenNthCalledWith(
      3,
      'Uploading kyoto.jpg... (0/2 ready)',
    )
    expect(photoProgressHandle.advance).toHaveBeenNthCalledWith(
      1,
      1,
      'Uploaded 1 photo (1/2).',
    )
    expect(photoProgressHandle.advance).toHaveBeenNthCalledWith(
      2,
      1,
      'Reused cached photo (2/2).',
    )
    expect(photoProgressHandle.stop).toHaveBeenCalledWith(
      'Photos ready: 1 uploaded, 1 reused.',
    )
  })

  it('ignores Google Drive photo progress events emitted before start', async () => {
    let filePath = exampleConfigFilePath

    mockSuccessfulBuild()
    vi.mocked(resolveGoogleDrivePhotos).mockImplementationOnce(
      (resolved, options) => {
        options?.onProgress?.({
          type: 'complete',
          completed: 0,
          uploaded: 0,
          cached: 0,
          total: 0,
        })

        return Promise.resolve(resolved)
      },
    )

    await build(filePath)

    expect(progress).not.toHaveBeenCalled()
    expect(log.success).toHaveBeenCalledWith(
      `Map written to ${exampleBuildOutputPath}.`,
    )
  })

  it('logs Google Drive cleanup warnings and still completes the build', async () => {
    let filePath = exampleConfigFilePath

    mockSuccessfulBuild()
    vi.mocked(resolveGoogleDrivePhotos).mockImplementationOnce(
      (resolved, options) => {
        options?.onWarning?.(
          'Google Drive file deletion failed for "old-file-id": delete failed',
        )

        return Promise.resolve(resolved)
      },
    )

    await build(filePath)

    expect(log.warn).toHaveBeenCalledWith(
      'Google Drive file deletion failed for "old-file-id": delete failed',
    )
    expect(log.success).toHaveBeenCalledWith(
      `Map written to ${exampleBuildOutputPath}.`,
    )
  })

  it('treats a directory target path as a project directory with index.yaml', async () => {
    let filePath = exampleConfigFilePath

    mockSuccessfulBuild()

    await build(exampleDirectoryPath)

    expect(loadConfig).toHaveBeenCalledWith(filePath)
  })

  it('uses index.yaml in the current directory when build target path is omitted', async () => {
    mockSuccessfulBuild()

    await build()

    expect(loadConfig).toHaveBeenCalledWith('index.yaml')
  })

  it('prompts for a missing Google Maps API key, saves it, and retries the build', async () => {
    let filePath = exampleConfigFilePath
    let config = createSensoJiConfig()
    let missingApiKeyError = new GoogleMapsApiKeyMissingError()

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce(null)
    vi.mocked(resolveConfig)
      .mockRejectedValueOnce(missingApiKeyError)
      .mockResolvedValueOnce(createResolvedSensoJiConfig())
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce('prompted-key')
    vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')

    await build(filePath)

    expect(vi.mocked(resolveConfig).mock.calls[0]?.[0]).toBe(config)
    expect(vi.mocked(resolveConfig).mock.calls[0]?.[1]).toMatchObject({
      cachePath: exampleResolutionCachePath,
    })
    expect(typeof vi.mocked(resolveConfig).mock.calls[0]?.[1]?.onProgress).toBe(
      'function',
    )
    expect(requestGoogleMapsApiKey).toHaveBeenCalledWith('missing')
    expect(saveGoogleMapsApiKey).toHaveBeenCalledWith(filePath, 'prompted-key')
    expect(vi.mocked(resolveConfig).mock.calls[1]?.[0]).toBe(config)
    expect(vi.mocked(resolveConfig).mock.calls[1]?.[1]).toMatchObject({
      cachePath: exampleResolutionCachePath,
      googleMapsApiKey: 'prompted-key',
    })
    expect(typeof vi.mocked(resolveConfig).mock.calls[1]?.[1]?.onProgress).toBe(
      'function',
    )
    expect(process.env['GOOGLE_MAPS_API_KEY']).toBe('prompted-key')
    expect(process.exitCode).toBeUndefined()
  })

  it('retries build without googleMapsApiKey when the prompted key trims to empty', async () => {
    let filePath = exampleConfigFilePath
    let missingApiKeyError = new GoogleMapsApiKeyMissingError()

    vi.mocked(loadConfig).mockResolvedValueOnce(createSensoJiConfig())
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce(null)
    vi.mocked(resolveConfig)
      .mockRejectedValueOnce(missingApiKeyError)
      .mockResolvedValueOnce(createResolvedSensoJiConfig())
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce(' '.repeat(3))
    vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')

    await build(filePath)

    expect(saveGoogleMapsApiKey).toHaveBeenCalledWith(filePath, '')
    expect(vi.mocked(resolveConfig).mock.calls[1]?.[1]).toMatchObject({
      cachePath: exampleResolutionCachePath,
    })
    expect(vi.mocked(resolveConfig).mock.calls[1]?.[1]).not.toHaveProperty(
      'googleMapsApiKey',
    )
    expect(process.env['GOOGLE_MAPS_API_KEY']).toBe('')
    expect(process.exitCode).toBeUndefined()
  })

  it('cancels the build when the Google Maps API key prompt is canceled', async () => {
    let filePath = exampleConfigFilePath
    let missingApiKeyError = new GoogleMapsApiKeyMissingError()

    vi.mocked(loadConfig).mockResolvedValueOnce(createSensoJiConfig())
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
    let missingApiKeyError = new GoogleMapsApiKeyMissingError()

    vi.mocked(isInteractiveTerminal).mockReturnValue(false)
    vi.mocked(loadConfig).mockResolvedValueOnce(createSensoJiConfig())
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
    let config = createSensoJiConfig()

    vi.mocked(loadConfig).mockResolvedValueOnce(config)
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('saved-invalid-key')
    vi.mocked(resolveConfig)
      .mockRejectedValueOnce(createInvalidApiKeyError())
      .mockResolvedValueOnce(createResolvedSensoJiConfig())
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce('replacement-key')
    vi.mocked(exportKml).mockReturnValueOnce('<kml>map</kml>')

    await build(filePath)

    expect(requestGoogleMapsApiKey).toHaveBeenCalledWith('invalid')
    expect(saveGoogleMapsApiKey).toHaveBeenCalledWith(
      filePath,
      'replacement-key',
    )
    expect(vi.mocked(resolveConfig).mock.calls[1]?.[0]).toBe(config)
    expect(vi.mocked(resolveConfig).mock.calls[1]?.[1]).toMatchObject({
      cachePath: exampleResolutionCachePath,
      googleMapsApiKey: 'replacement-key',
    })
    expect(typeof vi.mocked(resolveConfig).mock.calls[1]?.[1]?.onProgress).toBe(
      'function',
    )
    expect(process.env['GOOGLE_MAPS_API_KEY']).toBe('replacement-key')
    expect(process.exitCode).toBeUndefined()
  })

  it('cancels the build when replacement Google Maps API key prompt is canceled', async () => {
    let filePath = exampleConfigFilePath

    vi.mocked(loadConfig).mockResolvedValueOnce(createSensoJiConfig())
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('saved-invalid-key')
    vi.mocked(resolveConfig).mockRejectedValueOnce(createInvalidApiKeyError())
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce(null)

    await build(filePath)

    expect(requestGoogleMapsApiKey).toHaveBeenCalledWith('invalid')
    expect(cancel).toHaveBeenCalledWith('Build canceled.')
    expect(saveGoogleMapsApiKey).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('does not prompt for a replacement Google Maps API key in non-interactive mode', async () => {
    let filePath = exampleConfigFilePath

    vi.mocked(isInteractiveTerminal).mockReturnValue(false)
    vi.mocked(loadConfig).mockResolvedValueOnce(createSensoJiConfig())
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('saved-invalid-key')
    vi.mocked(resolveConfig).mockRejectedValueOnce(createInvalidApiKeyError())

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
    let resolutionCachePath = exampleResolutionCachePath

    vi.mocked(loadConfig).mockResolvedValueOnce(createKyotoStationConfig())
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
    let resolutionCachePath = exampleResolutionCachePath

    vi.mocked(loadConfig).mockResolvedValueOnce(createKyotoStationConfig())
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

    vi.mocked(loadConfig).mockResolvedValueOnce(createMissingPlaceConfig())
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
    let error = createGoogleGeocodingError(
      'Google returned status OVER_QUERY_LIMIT.',
      {
        isInvalidApiKey: false,
      },
    )

    vi.mocked(loadConfig).mockResolvedValueOnce(createMissingPlaceConfig())
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
    let invalidApiKeyError = createInvalidApiKeyError()

    vi.mocked(loadConfig).mockResolvedValueOnce(createSensoJiConfig())
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('saved-invalid-key')
    vi.mocked(resolveConfig)
      .mockRejectedValueOnce(invalidApiKeyError)
      .mockRejectedValueOnce(invalidApiKeyError)
    vi.mocked(requestGoogleMapsApiKey).mockResolvedValueOnce('replacement-key')

    await build(filePath)

    expect(requestGoogleMapsApiKey).toHaveBeenCalledExactlyOnceWith('invalid')
    expect(log.error).toHaveBeenCalledWith(
      `Google geocoding failed: ${invalidApiKeyError.message}`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs missing Google Drive config when local photo uploads need it', async () => {
    mockGoogleDrivePhotosError(
      new GoogleDriveConfigError(['GOOGLE_DRIVE_CLIENT_ID']),
    )

    await build(exampleConfigFilePath)

    expect(log.error).toHaveBeenCalledWith(
      'Google Drive config is incomplete.\n',
    )
    expect(log.error).toHaveBeenCalledWith('- Missing GOOGLE_DRIVE_CLIENT_ID')
    expect(log.error).toHaveBeenCalledWith(
      `Run \`pinbook drive-auth ${exampleConfigFilePath}\` or add the missing values to ${exampleEnvironmentPath}.`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs missing Google Drive config without a target path hint when build uses the current directory', async () => {
    mockGoogleDrivePhotosError(
      new GoogleDriveConfigError(['GOOGLE_DRIVE_CLIENT_ID']),
    )

    await build()

    expect(log.error).toHaveBeenCalledWith(
      'Run `pinbook drive-auth` or add the missing values to .env.',
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs local photo file errors', async () => {
    mockGoogleDrivePhotosError(
      new LocalPhotoFileNotFoundError('/tmp/kyoto.jpg'),
    )

    await build(exampleConfigFilePath)

    expect(log.error).toHaveBeenCalledWith(
      'Local photo file not found: /tmp/kyoto.jpg',
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs local photo processing errors', async () => {
    mockGoogleDrivePhotosError(
      new LocalPhotoProcessingError('/tmp/kyoto.jpg', {
        cause: new Error('bad image'),
      }),
    )

    await build(exampleConfigFilePath)

    expect(log.error).toHaveBeenCalledWith(
      'Local photo processing failed for /tmp/kyoto.jpg: bad image',
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs Google Drive upload failures', async () => {
    mockGoogleDrivePhotosError(
      new GoogleDrivePhotoUploadError('Google Drive upload failed'),
    )

    await build(exampleConfigFilePath)

    expect(log.error).toHaveBeenCalledWith('Google Drive upload failed')
    expect(process.exitCode).toBe(1)
  })

  it('logs photo upload cache syntax errors', async () => {
    mockGoogleDrivePhotosError(new PhotoUploadCacheSyntaxError('Invalid JSON'))

    await build(exampleConfigFilePath)

    expect(log.error).toHaveBeenCalledWith(
      `Photo upload cache is invalid JSON: ${examplePhotoUploadCachePath}`,
    )
    expect(log.error).toHaveBeenCalledWith(
      `Fix or delete ${examplePhotoUploadCachePath} and run build again.`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('logs photo upload cache validation issues', async () => {
    mockGoogleDrivePhotosError(
      createPhotoUploadCacheValidationError(['entries.photo: Invalid input']),
    )

    await build(exampleConfigFilePath)

    expect(log.error).toHaveBeenCalledWith('Photo upload cache is invalid.\n')
    expect(log.error).toHaveBeenCalledWith('- entries.photo: Invalid input')
    expect(log.error).toHaveBeenCalledWith(
      `Fix or delete ${examplePhotoUploadCachePath} and run build again.`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('rethrows unexpected errors', async () => {
    let filePath = exampleConfigFilePath

    vi.mocked(loadConfig).mockResolvedValueOnce(createKyotoStationConfig())
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
    vi.mocked(resolveConfig).mockRejectedValueOnce(new Error('boom'))

    await expect(build(filePath)).rejects.toThrow('boom')
  })

  it('rethrows unexpected non-Error values', async () => {
    let filePath = exampleConfigFilePath

    vi.mocked(loadConfig).mockResolvedValueOnce(createKyotoStationConfig())
    vi.mocked(loadGoogleMapsApiKey).mockResolvedValueOnce('test-key')
    vi.mocked(resolveConfig).mockRejectedValueOnce('boom')

    await expect(build(filePath)).rejects.toBe('boom')
  })
})
