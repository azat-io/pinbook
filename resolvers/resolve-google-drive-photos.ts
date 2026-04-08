import type { ResolvedMapConfig } from '../types/resolved-map-config'
import type { GoogleDriveConfig } from '../types/google-drive-config'

import { replaceLocalPhotosWithPublicUrls } from './replace-local-photos-with-public-urls'
import { getGoogleDriveUploadContext } from './get-google-drive-upload-context'
import { preparePhotoForGoogleDrive } from './prepare-photo-for-google-drive'
import { uploadPhotoToGoogleDrive } from './upload-photo-to-google-drive'
import { collectLocalPhotoPaths } from './collect-local-photo-paths'
import { loadPhotoUploadCache } from './load-photo-upload-cache'
import { savePhotoUploadCache } from './save-photo-upload-cache'
import { readLocalPhoto } from './read-local-photo'

/**
 * Progress events emitted while local photos are normalized, cached, and
 * uploaded to Google Drive.
 */
export type ResolveGoogleDrivePhotosProgressEvent =
  | ({
      /**
       * Signals that a photo upload to Google Drive has started.
       */
      type: 'upload-start'

      /**
       * Absolute local path of the photo being uploaded.
       */
      photoPath: string
    } & ResolveGoogleDrivePhotosProgressSnapshot)
  | ({
      /**
       * Signals that a photo upload to Google Drive has completed.
       */
      type: 'upload-complete'

      /**
       * Absolute local path of the uploaded photo.
       */
      photoPath: string
    } & ResolveGoogleDrivePhotosProgressSnapshot)
  | ({
      /**
       * Signals that a photo was reused from the local upload cache.
       */
      type: 'cache-hit'

      /**
       * Absolute local path of the cached photo.
       */
      photoPath: string
    } & ResolveGoogleDrivePhotosProgressSnapshot)
  | ({
      /**
       * Signals that Drive authentication and target folder resolution have
       * completed.
       */
      type: 'drive-auth-complete'
    } & ResolveGoogleDrivePhotosProgressSnapshot)
  | ({
      /**
       * Signals that Drive authentication and target folder resolution have
       * started.
       */
      type: 'drive-auth-start'
    } & ResolveGoogleDrivePhotosProgressSnapshot)
  | ({
      /**
       * Signals that all local photo processing for the current build has
       * completed.
       */
      type: 'complete'
    } & ResolveGoogleDrivePhotosProgressSnapshot)
  | ({
      /**
       * Signals that local photo processing is about to begin.
       */
      type: 'start'
    } & ResolveGoogleDrivePhotosProgressSnapshot)

/**
 * Options that control how local photos are uploaded and cached during config
 * resolution.
 */
interface ResolveGoogleDrivePhotosOptions {
  /**
   * Optional callback invoked while local photos are processed and uploaded.
   */
  onProgress?(event: ResolveGoogleDrivePhotosProgressEvent): void

  /**
   * Partial Google Drive credentials loaded from `.env` and the process
   * environment.
   */
  googleDriveConfig?: Partial<GoogleDriveConfig>

  /**
   * Optional path to the JSON cache that stores previously uploaded photo
   * metadata.
   */
  cachePath?: string
}

/**
 * Aggregate counters reported while local photos are prepared and uploaded.
 */
interface ResolveGoogleDrivePhotosProgressSnapshot {
  /**
   * Number of local photos that have finished processing.
   */
  completed: number

  /**
   * Number of photos uploaded to Google Drive during the current build.
   */
  uploaded: number

  /**
   * Number of photos reused from the local upload cache.
   */
  cached: number

  /**
   * Total number of distinct local photos referenced by the map.
   */
  total: number
}

/**
 * Resolved Google Drive auth token and target folder reused across photo
 * uploads within a single build.
 */
type GoogleDriveUploadContext = Awaited<
  ReturnType<typeof getGoogleDriveUploadContext>
>

/**
 * Uploads local photo paths to Google Drive and rewrites them to public URLs.
 *
 * Public HTTP(S) URLs are left unchanged.
 *
 * @param config - Config whose coordinates are already resolved.
 * @param options - Google Drive credentials and cache options.
 * @returns Config whose photo values are public URLs.
 */
export async function resolveGoogleDrivePhotos(
  config: ResolvedMapConfig,
  options: ResolveGoogleDrivePhotosOptions = {},
): Promise<ResolvedMapConfig> {
  let localPhotoPaths = [...collectLocalPhotoPaths(config)]

  if (localPhotoPaths.length === 0) {
    return config
  }

  let cache = await loadPhotoUploadCache(options.cachePath)
  let cacheEntries = { ...cache.entries }
  let publicUrlByPath: Record<string, string> = {}
  let cacheChanged = false
  let progressState: ResolveGoogleDrivePhotosProgressSnapshot = {
    total: localPhotoPaths.length,
    completed: 0,
    uploaded: 0,
    cached: 0,
  }
  let googleDriveUploadContextPromise:
    | Promise<GoogleDriveUploadContext>
    | undefined

  /**
   * Forwards a progress event to the optional external listener.
   *
   * @param event - Snapshot describing the current local photo progress state.
   */
  function emitProgress(event: ResolveGoogleDrivePhotosProgressEvent): void {
    options.onProgress?.(event)
  }

  emitProgress({
    ...progressState,
    type: 'start',
  })

  let photoResults = await Promise.all(
    localPhotoPaths.map(async photoPath => {
      let photoBuffer = await readLocalPhoto(photoPath)
      let preparedPhoto = await preparePhotoForGoogleDrive({
        buffer: photoBuffer,
        photoPath,
      })
      let cachedEntry = cacheEntries[photoPath]

      if (cachedEntry?.hash === preparedPhoto.hash) {
        progressState.cached += 1
        progressState.completed += 1
        emitProgress({
          ...progressState,
          type: 'cache-hit',
          photoPath,
        })

        return {
          publicUrl: cachedEntry.publicUrl,
          photoPath,
        }
      }

      if (!googleDriveUploadContextPromise) {
        emitProgress({
          ...progressState,
          type: 'drive-auth-start',
        })
        googleDriveUploadContextPromise = getGoogleDriveUploadContext(
          googleDriveUploadContextPromise,
          {
            googleDriveConfig: options.googleDriveConfig,
            mapTitle: config.map.title,
          },
        ).then(googleDriveUploadContext => {
          emitProgress({
            ...progressState,
            type: 'drive-auth-complete',
          })

          return googleDriveUploadContext
        })
      }

      let googleDriveUploadContext = await googleDriveUploadContextPromise
      emitProgress({
        ...progressState,
        type: 'upload-start',
        photoPath,
      })
      let uploadedPhoto = await uploadPhotoToGoogleDrive({
        targetFolderId: googleDriveUploadContext.targetFolderId,
        accessToken: googleDriveUploadContext.accessToken,
        uploadFileName: preparedPhoto.uploadFileName,
        buffer: preparedPhoto.buffer,
        photoPath,
      })

      progressState.uploaded += 1
      progressState.completed += 1
      emitProgress({
        ...progressState,
        type: 'upload-complete',
        photoPath,
      })

      return {
        cacheEntry: {
          publicUrl: uploadedPhoto.publicUrl,
          hash: preparedPhoto.hash,
        },
        publicUrl: uploadedPhoto.publicUrl,
        photoPath,
      }
    }),
  )

  for (let photoResult of photoResults) {
    publicUrlByPath[photoResult.photoPath] = photoResult.publicUrl

    let cacheEntry =
      'cacheEntry' in photoResult ? photoResult.cacheEntry : undefined

    if (!cacheEntry) {
      continue
    }

    cacheEntries[photoResult.photoPath] = cacheEntry
    cacheChanged = true
  }

  if (cacheChanged) {
    await savePhotoUploadCache(
      {
        ...cache,
        entries: cacheEntries,
      },
      options.cachePath,
    )
  }

  emitProgress({
    ...progressState,
    type: 'complete',
  })

  return {
    ...config,
    pins: config.pins.map(pin => {
      if (!pin.photo) {
        return pin
      }

      return {
        ...pin,
        photo: replaceLocalPhotosWithPublicUrls(pin.photo, publicUrlByPath),
      }
    }),
  }
}
