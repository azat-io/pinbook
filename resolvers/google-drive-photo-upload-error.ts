/**
 * Error thrown when Google rejects an auth or upload request.
 */
export class GoogleDrivePhotoUploadError extends Error {
  /**
   * Creates a Google Drive upload error.
   *
   * @param message - Human-readable failure message.
   * @param options - Standard error options such as `cause`.
   */
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'GoogleDrivePhotoUploadError'
  }
}
