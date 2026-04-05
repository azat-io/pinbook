import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

import { LocalPhotoFileNotFoundError } from './local-photo-file-not-found-error'

/**
 * Reads a local photo from disk and computes a stable content hash used by the
 * upload cache.
 *
 * @param photoPath - Absolute path to the local photo.
 * @returns Binary contents and SHA-256 hash of the file.
 * @throws {LocalPhotoFileNotFoundError} Thrown when the local file is missing.
 */
export async function readLocalPhoto(photoPath: string): Promise<{
  buffer: Buffer
  hash: string
}> {
  let buffer: Buffer

  try {
    buffer = await readFile(photoPath)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new LocalPhotoFileNotFoundError(photoPath)
    }

    throw error
  }

  return {
    hash: createHash('sha256').update(buffer).digest('hex'),
    buffer,
  }
}
