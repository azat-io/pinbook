/**
 * Error thrown when a referenced local photo cannot be normalized for upload.
 */
export class LocalPhotoProcessingError extends Error {
  /**
   * Absolute path of the photo that failed to process.
   */
  public photoPath: string

  /**
   * Creates a local photo processing error.
   *
   * @param photoPath - Absolute path of the photo that failed to process.
   * @param cause - Original image processing failure.
   */
  public constructor(photoPath: string, cause: unknown) {
    let details =
      cause instanceof Error && cause.message.trim().length > 0 ?
        `: ${cause.message}`
      : '.'

    super(`Local photo processing failed for ${photoPath}${details}`)
    this.name = 'LocalPhotoProcessingError'
    this.photoPath = photoPath
  }
}
