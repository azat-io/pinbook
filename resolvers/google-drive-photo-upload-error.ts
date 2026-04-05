/**
 * Error thrown when Google rejects an auth or upload request.
 */
export class GoogleDrivePhotoUploadError extends Error {
  /**
   * Creates a Google Drive upload error.
   *
   * @param message - Human-readable failure message.
   */
  public constructor(message: string) {
    super(message)
    this.name = 'GoogleDrivePhotoUploadError'
  }
}
