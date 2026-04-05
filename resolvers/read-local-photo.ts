import { readFile } from 'node:fs/promises'

import { LocalPhotoFileNotFoundError } from './local-photo-file-not-found-error'

/**
 * Reads a local photo from disk.
 *
 * @param photoPath - Absolute path to the local photo.
 * @returns Binary contents of the file.
 * @throws {LocalPhotoFileNotFoundError} Thrown when the local file is missing.
 */
export async function readLocalPhoto(photoPath: string): Promise<Buffer> {
  try {
    return await readFile(photoPath)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new LocalPhotoFileNotFoundError(photoPath)
    }

    throw error
  }
}
