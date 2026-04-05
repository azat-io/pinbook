import { isPublicPhotoUrl } from '../pins/is-public-photo-url'

/**
 * Rewrites one or more photo sources by replacing local paths with their
 * uploaded public Drive URLs.
 *
 * @param photo - Single photo source or list of sources.
 * @param publicUrlByPath - Mapping of local absolute photo paths to public
 *   URLs.
 * @returns Photo sources whose local paths have been rewritten.
 */
export function replaceLocalPhotosWithPublicUrls(
  photo: string[] | string,
  publicUrlByPath: Record<string, string>,
): string[] | string {
  if (Array.isArray(photo)) {
    return photo.map(photoEntry =>
      replaceLocalPhotoWithPublicUrl(photoEntry, publicUrlByPath),
    )
  }

  return replaceLocalPhotoWithPublicUrl(photo, publicUrlByPath)
}

/**
 * Rewrites a single photo source by replacing a local path with its public
 * Drive URL.
 *
 * @param photo - Single photo source value.
 * @param publicUrlByPath - Mapping of local absolute photo paths to public
 *   URLs.
 * @returns Original URL or rewritten public Drive URL.
 */
function replaceLocalPhotoWithPublicUrl(
  photo: string,
  publicUrlByPath: Record<string, string>,
): string {
  if (isPublicPhotoUrl(photo)) {
    return photo
  }

  return publicUrlByPath[photo] ?? photo
}
