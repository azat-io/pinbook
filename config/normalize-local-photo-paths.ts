import { dirname, resolve } from 'node:path'

import { isPublicPhotoUrl } from '../pins/is-public-photo-url'

/**
 * Rewrites local photo paths so they remain stable after imported pin files are
 * merged into the root config.
 *
 * @param pins - Pins loaded from a single source YAML file.
 * @param filePath - Path to the YAML file that defined the pins.
 * @returns Pins whose local photo paths are resolved against the source file.
 */
export function normalizeLocalPhotoPaths<
  Pin extends {
    photo?: string[] | string
  },
>(pins: Pin[], filePath: string): Pin[] {
  return pins.map(pin => {
    if (!pin.photo) {
      return pin
    }

    return {
      ...pin,
      photo: normalizePhotoValue(pin.photo, filePath),
    }
  })
}

/**
 * Rewrites one or more photo sources so local paths become absolute.
 *
 * @param photo - Single photo source or list of photo sources.
 * @param filePath - Path to the YAML file that declared the photo value.
 * @returns Normalized photo source value.
 */
function normalizePhotoValue(
  photo: string[] | string,
  filePath: string,
): string[] | string {
  if (Array.isArray(photo)) {
    return photo.map(photoEntry => normalizePhotoEntry(photoEntry, filePath))
  }

  return normalizePhotoEntry(photo, filePath)
}

/**
 * Rewrites a single photo source so local paths become absolute.
 *
 * @param photo - Single photo source value.
 * @param filePath - Path to the YAML file that declared the photo value.
 * @returns Original public URL or resolved absolute local path.
 */
function normalizePhotoEntry(photo: string, filePath: string): string {
  if (isPublicPhotoUrl(photo)) {
    return photo
  }

  return resolve(dirname(filePath), photo)
}
