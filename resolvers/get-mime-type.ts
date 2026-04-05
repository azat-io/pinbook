import { extname } from 'node:path'

/**
 * Returns the MIME type used for a local photo upload based on its file
 * extension.
 *
 * @param filePath - Local photo file path.
 * @returns MIME type string passed to the multipart upload request.
 */
export function getMimeType(filePath: string): string {
  let extension = extname(filePath).toLowerCase()

  switch (extension) {
    case '.avif':
      return 'image/avif'
    case '.heic':
      return 'image/heic'
    case '.heif':
      return 'image/heif'
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg'
    case '.tiff':
    case '.tif':
      return 'image/tiff'
    case '.webp':
      return 'image/webp'
    case '.bmp':
      return 'image/bmp'
    case '.gif':
      return 'image/gif'
    case '.png':
      return 'image/png'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}
