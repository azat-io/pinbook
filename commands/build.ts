import { progress, cancel, log } from '@clack/prompts'
import { writeFile, mkdir } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import type { ResolveGoogleDrivePhotosProgressEvent } from '../resolvers/resolve-google-drive-photos'
import type { ResolveConfigProgressEvent } from '../types/resolve-config-options'

import {
  PhotoUploadCacheValidationError,
  PhotoUploadCacheSyntaxError,
} from '../resolvers/load-photo-upload-cache'
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
import { GoogleDriveConfigError } from '../resolvers/google-drive-config-error'
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
 * Minimal interface for the address-resolution progress reporter used during
 * `pinbook build`.
 */
interface AddressProgressReporter {
  /**
   * Applies the next address-resolution progress event.
   *
   * @param event - Progress event emitted by config resolution.
   */
  onProgress(event: ResolveConfigProgressEvent): void

  /**
   * Stops the current progress UI with a success message.
   */
  finish(): void

  /**
   * Clears the current progress UI without printing a completion message.
   */
  clear(): void
}

/**
 * Minimal interface for the photo-upload progress reporter used during `pinbook
 * build`.
 */
interface PhotoProgressReporter {
  /**
   * Applies the next local-photo progress event.
   *
   * @param event - Progress event emitted by local photo processing.
   */
  onProgress(event: ResolveGoogleDrivePhotosProgressEvent): void

  /**
   * Clears the current progress UI without printing a completion message.
   */
  clear(): void
}

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
  let addressProgressReporter = createAddressProgressReporter()
  let photoProgressReporter = createPhotoProgressReporter()

  try {
    log.step(`Building map from ${filePath}.`)

    let config = await loadConfig(filePath)
    let googleDriveConfig = await loadGoogleDriveConfig(filePath)
    let googleMapsApiKey = await loadGoogleMapsApiKey(filePath)
    let resolvedConfig

    try {
      resolvedConfig = await resolveConfig(config, {
        cachePath: resolutionCachePath,
        ...(googleMapsApiKey && { googleMapsApiKey }),
        onProgress: addressProgressReporter.onProgress,
      })
      addressProgressReporter.finish()
    } catch (error) {
      addressProgressReporter.clear()

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

      resolvedConfig = await resolveConfig(config, {
        cachePath: resolutionCachePath,
        ...(googleMapsApiKey && { googleMapsApiKey }),
        onProgress: addressProgressReporter.onProgress,
      })
      addressProgressReporter.finish()
    }

    resolvedConfig = await resolveGoogleDrivePhotos(resolvedConfig, {
      onWarning(message) {
        log.warn(message)
      },
      onProgress: photoProgressReporter.onProgress,
      cachePath: photoUploadCachePath,
      googleDriveConfig,
    })

    let kml = exportKml(resolvedConfig, {
      documentDescription: true,
    })

    log.step(`Writing KML artifact to ${buildOutputPath}.`)

    await mkdir(buildOutputDirectory, {
      recursive: true,
    })

    await writeFile(buildOutputPath, kml, 'utf8')

    log.success(`Map written to ${buildOutputPath}.`)
  } catch (error) {
    addressProgressReporter.clear()
    photoProgressReporter.clear()

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

    if (error instanceof GoogleDriveConfigError) {
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
 * Creates a progress reporter that renders local photo processing and Google
 * Drive upload progress in the terminal.
 *
 * @returns Reporter consumed by `resolveGoogleDrivePhotos`.
 */
function createPhotoProgressReporter(): PhotoProgressReporter {
  let photoProgressBar: ReturnType<typeof progress> | null = null

  return {
    onProgress(event: ResolveGoogleDrivePhotosProgressEvent): void {
      if (event.type === 'start') {
        photoProgressBar = progress({
          max: event.total,
        })
        photoProgressBar.start(
          `Processing ${event.total} local ${pluralize(event.total, 'photo')}...`,
        )

        return
      }

      if (!photoProgressBar) {
        return
      }

      if (event.type === 'drive-auth-start') {
        photoProgressBar.message(
          `Authenticating with Google Drive... (${event.completed}/${event.total} ready)`,
        )

        return
      }

      if (event.type === 'drive-auth-complete') {
        photoProgressBar.message(
          `Google Drive ready. Uploading photos... (${event.completed}/${event.total} ready)`,
        )

        return
      }

      if (event.type === 'cache-hit') {
        photoProgressBar.advance(
          1,
          `Reused cached ${pluralize(event.cached, 'photo')} (${event.completed}/${event.total}).`,
        )

        return
      }

      if (event.type === 'upload-start') {
        photoProgressBar.message(
          `Uploading ${basename(event.photoPath)}... (${event.completed}/${event.total} ready)`,
        )

        return
      }

      if (event.type === 'upload-complete') {
        photoProgressBar.advance(
          1,
          `Uploaded ${event.uploaded} ${pluralize(event.uploaded, 'photo')} (${event.completed}/${event.total}).`,
        )

        return
      }

      photoProgressBar.stop(
        `Photos ready: ${event.uploaded} uploaded, ${event.cached} reused.`,
      )
      photoProgressBar = null
    },
    clear(): void {
      photoProgressBar?.clear()
      photoProgressBar = null
    },
  }
}

/**
 * Creates a progress reporter that renders geocoding progress in the terminal.
 *
 * @returns Reporter consumed by `resolveConfig`.
 */
function createAddressProgressReporter(): AddressProgressReporter {
  let addressProgressBar: ReturnType<typeof progress> | null = null

  return {
    onProgress(event: ResolveConfigProgressEvent): void {
      if (event.type === 'geocoding-start') {
        addressProgressBar = progress({
          max: event.total,
        })
        addressProgressBar.start(
          `Resolving ${event.total} uncached ${pluralize(event.total, 'address', 'addresses')} with Google Maps...`,
        )

        return
      }

      addressProgressBar?.advance(
        1,
        `Resolved ${event.completed}/${event.total} ${pluralize(event.total, 'address', 'addresses')} with Google Maps...`,
      )
    },
    finish(): void {
      if (!addressProgressBar) {
        return
      }

      addressProgressBar.stop('Address resolution complete.')
      addressProgressBar = null
    },
    clear(): void {
      addressProgressBar?.clear()
      addressProgressBar = null
    },
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

/**
 * Returns a singular or plural noun form for a simple count.
 *
 * @param count - Numeric count to describe.
 * @param singular - Singular word form.
 * @param plural - Optional plural word form override.
 * @returns Singular form for `1`, otherwise plural form.
 */
function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural
}
