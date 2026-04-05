import { writeFile, mkdir } from 'node:fs/promises'
import { cancel, log } from '@clack/prompts'
import { dirname, join } from 'node:path'

import {
  PhotoUploadCacheValidationError,
  PhotoUploadCacheSyntaxError,
} from '../resolvers/load-photo-upload-cache'
import { GoogleDriveConfigurationError } from '../resolvers/google-drive-configuration-error'
import { getDefaultPhotoUploadCachePath } from '../paths/get-default-photo-upload-cache-path'
import { LocalPhotoFileNotFoundError } from '../resolvers/local-photo-file-not-found-error'
import { GoogleDrivePhotoUploadError } from '../resolvers/google-drive-photo-upload-error'
import { getDefaultResolutionCachePath } from '../paths/get-default-resolution-cache-path'
import {
  LocationResolutionError,
  resolveConfig,
} from '../resolvers/resolve-config'
import { LocalPhotoProcessingError } from '../resolvers/local-photo-processing-error'
import { resolveGoogleDrivePhotos } from '../resolvers/resolve-google-drive-photos'
import { getBuildOutputDirectory } from '../paths/get-build-output-directory'
import { requestGoogleMapsApiKey } from '../cli/request-google-maps-api-key'
import { loadGoogleDriveConfig } from '../config/load-google-drive-config'
import { resolveConfigFilePath } from '../paths/resolve-config-file-path'
import { saveGoogleMapsApiKey } from '../config/save-google-maps-api-key'
import { loadGoogleMapsApiKey } from '../config/load-google-maps-api-key'
import { isInteractiveTerminal } from '../cli/is-interactive-terminal'
import { getBuildOutputPath } from '../paths/get-build-output-path'
import { exportKml } from '../serializers/export-kml'
import { loadConfig } from '../config/load-config'

/**
 * Validates a config file and writes its serialized KML artifact to the local
 * build output path.
 *
 * @param targetPath - Optional YAML config path or project directory path.
 */
export async function build(targetPath?: string): Promise<void> {
  let filePath = resolveConfigFilePath(targetPath)
  let buildOutputDirectory = getBuildOutputDirectory(filePath)
  let buildOutputPath = getBuildOutputPath(filePath)
  let photoUploadCachePath = getDefaultPhotoUploadCachePath(filePath)
  let resolutionCachePath = getDefaultResolutionCachePath(filePath)

  try {
    let config = await loadConfig(filePath)
    let googleDriveConfig = await loadGoogleDriveConfig(filePath)
    let googleMapsApiKey = await loadGoogleMapsApiKey(filePath)
    let resolvedConfig

    try {
      resolvedConfig = await resolveConfigWithGoogleMapsApiKey(
        config,
        googleMapsApiKey,
        resolutionCachePath,
      )
    } catch (error) {
      if (!shouldPromptForGoogleMapsApiKey(error)) {
        throw error
      }

      if (!isInteractiveTerminal()) {
        logNonInteractiveGoogleMapsApiKeyError(filePath, error)
        process.exitCode = 1

        return
      }

      let promptedGoogleMapsApiKey = await requestGoogleMapsApiKey(
        error.name === 'GoogleMapsApiKeyMissingError' ? 'missing' : 'invalid',
      )

      if (promptedGoogleMapsApiKey === null) {
        cancel('Build canceled.')
        process.exitCode = 1

        return
      }

      googleMapsApiKey = promptedGoogleMapsApiKey.trim()

      process.env['GOOGLE_MAPS_API_KEY'] = googleMapsApiKey

      await saveGoogleMapsApiKey(filePath, googleMapsApiKey)

      resolvedConfig = await resolveConfigWithGoogleMapsApiKey(
        config,
        googleMapsApiKey,
        resolutionCachePath,
      )
    }

    resolvedConfig = await resolveGoogleDrivePhotos(resolvedConfig, {
      cachePath: photoUploadCachePath,
      googleDriveConfig,
    })

    let kml = exportKml(resolvedConfig, {
      documentDescription: true,
    })

    await mkdir(buildOutputDirectory, {
      recursive: true,
    })

    await writeFile(buildOutputPath, kml, 'utf8')

    log.success(`Map written to ${buildOutputPath}.`)
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'ConfigValidationError' &&
      'issues' in error &&
      Array.isArray(error.issues)
    ) {
      log.error('Config is invalid.\n')

      for (let issue of error.issues) {
        log.error(`- ${issue}`)
      }

      process.exitCode = 1

      return
    }

    if (error instanceof Error && error.name === 'GoogleGeocodingError') {
      log.error(`Google geocoding failed: ${error.message}`)
      process.exitCode = 1

      return
    }

    if (error instanceof LocationResolutionError) {
      log.error('Unresolved addresses were found.\n')

      for (let issue of error.unresolvedLocations) {
        log.error(`- ${issue.pinId}: ${issue.address}`)
      }

      log.error(`Add them to ${resolutionCachePath} and run build again.`)
      process.exitCode = 1

      return
    }

    if (error instanceof GoogleDriveConfigurationError) {
      let driveAuthCommand =
        targetPath ? `pinbook drive-auth ${targetPath}` : 'pinbook drive-auth'

      log.error('Google Drive config is incomplete.\n')

      for (let variableName of error.missingVariables) {
        log.error(`- Missing ${variableName}`)
      }

      log.error(
        `Run \`${driveAuthCommand}\` or add the missing values to ${join(dirname(filePath), '.env')}.`,
      )
      process.exitCode = 1

      return
    }

    if (error instanceof GoogleDrivePhotoUploadError) {
      log.error(error.message)
      process.exitCode = 1

      return
    }

    if (error instanceof LocalPhotoFileNotFoundError) {
      log.error(`Local photo file not found: ${error.photoPath}`)
      process.exitCode = 1

      return
    }

    if (error instanceof LocalPhotoProcessingError) {
      log.error(error.message)
      process.exitCode = 1

      return
    }

    if (error instanceof Error && error.name === 'ConfigSyntaxError') {
      log.error(`Invalid YAML: ${error.message}`)
      process.exitCode = 1

      return
    }

    if (error instanceof Error && error.name === 'ResolutionCacheSyntaxError') {
      log.error(`Resolution cache is invalid JSON: ${resolutionCachePath}`)
      log.error(`Fix or delete ${resolutionCachePath} and run build again.`)
      process.exitCode = 1

      return
    }

    if (
      error instanceof Error &&
      error.name === 'ResolutionCacheValidationError' &&
      'issues' in error &&
      Array.isArray(error.issues)
    ) {
      log.error('Resolution cache is invalid.\n')

      for (let issue of error.issues) {
        log.error(`- ${issue}`)
      }

      log.error(`Fix or delete ${resolutionCachePath} and run build again.`)
      process.exitCode = 1

      return
    }

    if (error instanceof PhotoUploadCacheSyntaxError) {
      log.error(`Photo upload cache is invalid JSON: ${photoUploadCachePath}`)
      log.error(`Fix or delete ${photoUploadCachePath} and run build again.`)
      process.exitCode = 1

      return
    }

    if (error instanceof PhotoUploadCacheValidationError) {
      log.error('Photo upload cache is invalid.\n')

      for (let issue of error.issues) {
        log.error(`- ${issue}`)
      }

      log.error(`Fix or delete ${photoUploadCachePath} and run build again.`)
      process.exitCode = 1

      return
    }

    if (isFileNotFoundError(error)) {
      log.error(`Config file not found: ${filePath}`)
      process.exitCode = 1

      return
    }

    throw error
  }
}

/**
 * Logs a non-interactive API key error with an actionable `.env` hint.
 *
 * @param filePath - Path to the YAML config file being built.
 * @param error - Missing or invalid API key error.
 */
function logNonInteractiveGoogleMapsApiKeyError(
  filePath: string,
  error: Error,
): void {
  let environmentPath = join(dirname(filePath), '.env')

  if (error.name === 'GoogleMapsApiKeyMissingError') {
    log.error(
      `Google Maps API key is required to geocode uncached addresses. Set GOOGLE_MAPS_API_KEY or add it to ${environmentPath}.`,
    )

    return
  }

  log.error(
    `Google Maps API key was rejected. Update GOOGLE_MAPS_API_KEY or ${environmentPath} and run build again.`,
  )
}

/**
 * Checks whether the thrown value should trigger an interactive API key prompt.
 *
 * @param error - Unknown thrown value from config resolution.
 * @returns `true` when the error indicates a missing or invalid API key that
 *   can be retried interactively.
 */
function shouldPromptForGoogleMapsApiKey(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false
  }

  if (error.name === 'GoogleMapsApiKeyMissingError') {
    return true
  }

  if (error.name !== 'GoogleGeocodingError') {
    return false
  }

  return (
    'isInvalidApiKey' in error &&
    typeof error.isInvalidApiKey === 'boolean' &&
    error.isInvalidApiKey
  )
}

/**
 * Calls `resolveConfig` with the optional Google Maps API key when available.
 *
 * @param config - Parsed and validated map config.
 * @param googleMapsApiKey - Optional Google Maps API key for address geocoding.
 * @param resolutionCachePath - Path to the address resolution cache file.
 * @returns Resolved config whose pins all contain coordinates.
 */
function resolveConfigWithGoogleMapsApiKey(
  config: Awaited<ReturnType<typeof loadConfig>>,
  googleMapsApiKey: string | null,
  resolutionCachePath: string,
): ReturnType<typeof resolveConfig> {
  return resolveConfig(config, {
    cachePath: resolutionCachePath,
    ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
  })
}

/**
 * Checks whether the thrown value represents a missing file system entry.
 *
 * @param error - Unknown thrown value.
 * @returns `true` when the error has the `ENOENT` code.
 */
function isFileNotFoundError(
  error: unknown,
): error is { code: string } & Error {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
