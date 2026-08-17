/**
 * Error thrown when Google Drive photo uploads are required but credentials are
 * incomplete.
 */
export class GoogleDriveConfigError extends Error {
  /**
   * Missing required Google Drive environment variables.
   */
  public missingVariables: string[]

  /**
   * Creates a configuration error listing the missing variables.
   *
   * @param missingVariables - Required variable names that were not provided.
   * @param options - Standard error options such as `cause`.
   */
  public constructor(missingVariables: string[], options?: ErrorOptions) {
    super('Google Drive configuration is incomplete', options)
    this.name = 'GoogleDriveConfigError'
    this.missingVariables = missingVariables
  }
}
