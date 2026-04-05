import { basename, extname } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

import {
  PHOTO_UPLOAD_WEBP_QUALITY,
  PHOTO_UPLOAD_HEIGHT,
  PHOTO_UPLOAD_WIDTH,
} from '../constants'
import { LocalPhotoProcessingError } from './local-photo-processing-error'

/**
 * Normalizes a local image into a deterministic WebP artifact ready for Google
 * Drive upload.
 *
 * @param options - Source photo path and raw bytes.
 * @returns Converted upload buffer, cache hash, and upload file name.
 */
export async function preparePhotoForGoogleDrive(options: {
  photoPath: string
  buffer: Buffer
}): Promise<{
  uploadFileName: string
  buffer: Buffer
  hash: string
}> {
  try {
    let buffer = await sharp(options.buffer)
      .rotate()
      .resize(PHOTO_UPLOAD_WIDTH, PHOTO_UPLOAD_HEIGHT, {
        position: 'centre',
        fit: 'cover',
      })
      .webp({
        quality: PHOTO_UPLOAD_WEBP_QUALITY,
      })
      .toBuffer()

    return {
      hash: createHash('sha256').update(buffer).digest('hex'),
      uploadFileName: toWebpFileName(options.photoPath),
      buffer,
    }
  } catch (error) {
    throw new LocalPhotoProcessingError(options.photoPath, error)
  }
}

function toWebpFileName(photoPath: string): string {
  let fileName = basename(photoPath)
  let extension = extname(fileName)

  if (extension.length === 0) {
    return `${fileName}.webp`
  }

  return `${fileName.slice(0, -extension.length)}.webp`
}
