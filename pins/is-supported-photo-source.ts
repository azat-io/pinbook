import { isPublicPhotoUrl } from './is-public-photo-url'

let uriWithSchemePattern = /^[a-z][\d+\-.a-z]*:\/\//iu

/**
 * Checks whether a photo value is either a public HTTP(S) URL or a local file
 * path.
 *
 * @param value - Raw photo value from config.
 * @returns `true` when the value can be handled by Pinbook.
 */
export function isSupportedPhotoSource(value: string): boolean {
  return isPublicPhotoUrl(value) || !uriWithSchemePattern.test(value)
}
