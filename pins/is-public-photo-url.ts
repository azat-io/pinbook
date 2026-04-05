/**
 * Checks whether a photo value is already a public HTTP(S) URL.
 *
 * @param value - Raw photo value from config.
 * @returns `true` when the value starts with `http://` or `https://`.
 */
export function isPublicPhotoUrl(value: string): boolean {
  return /^https?:\/\//u.test(value)
}
