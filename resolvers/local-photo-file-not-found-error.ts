/**
 * Error thrown when a referenced local photo file does not exist.
 */
export class LocalPhotoFileNotFoundError extends Error {
  /**
   * Absolute path of the missing local photo.
   */
  public photoPath: string

  /**
   * Creates a local file not found error.
   *
   * @param photoPath - Absolute path of the missing photo.
   * @param options - Standard error options such as `cause`.
   */
  public constructor(photoPath: string, options?: ErrorOptions) {
    super(`Local photo file not found: ${photoPath}`, options)
    this.name = 'LocalPhotoFileNotFoundError'
    this.photoPath = photoPath
  }
}
