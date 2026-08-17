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
   * @param options - Standard error options carrying the original image
   *   processing failure as `cause`.
   */
  public constructor(photoPath: string, options?: ErrorOptions) {
    let cause = options?.cause
    let details =
      cause instanceof Error && cause.message.trim().length > 0 ?
        `: ${cause.message}`
      : '.'

    super(`Local photo processing failed for ${photoPath}${details}`, options)
    this.name = 'LocalPhotoProcessingError'
    this.photoPath = photoPath
  }
}
