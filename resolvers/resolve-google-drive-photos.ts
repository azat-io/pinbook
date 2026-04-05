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
 * Options that control how local photos are uploaded and cached during config
 * resolution.
 */
interface ResolveGoogleDrivePhotosOptions {
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
  let googleDriveUploadContextPromise:
    | Promise<GoogleDriveUploadContext>
    | undefined

  let photoResults = await Promise.all(
    localPhotoPaths.map(async photoPath => {
      let photoBuffer = await readLocalPhoto(photoPath)
      let preparedPhoto = await preparePhotoForGoogleDrive({
        buffer: photoBuffer,
        photoPath,
      })
      let cachedEntry = cacheEntries[photoPath]

      if (cachedEntry?.hash === preparedPhoto.hash) {
        return {
          publicUrl: cachedEntry.publicUrl,
          photoPath,
        }
      }

      googleDriveUploadContextPromise = getGoogleDriveUploadContext(
        googleDriveUploadContextPromise,
        {
          googleDriveConfig: options.googleDriveConfig,
          mapTitle: config.map.title,
        },
      )

      let googleDriveUploadContext = await googleDriveUploadContextPromise
      let uploadedPhoto = await uploadPhotoToGoogleDrive({
        targetFolderId: googleDriveUploadContext.targetFolderId,
        accessToken: googleDriveUploadContext.accessToken,
        uploadFileName: preparedPhoto.uploadFileName,
        buffer: preparedPhoto.buffer,
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
