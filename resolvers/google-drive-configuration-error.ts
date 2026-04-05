/**
 * Error thrown when Google Drive photo uploads are required but credentials are
 * incomplete.
 */
export class GoogleDriveConfigurationError extends Error {
  /**
   * Missing required Google Drive environment variables.
   */
  public missingVariables: string[]

  /**
   * Creates a configuration error listing the missing variables.
   *
   * @param missingVariables - Required variable names that were not provided.
   */
  public constructor(missingVariables: string[]) {
    super('Google Drive configuration is incomplete')
    this.name = 'GoogleDriveConfigurationError'
    this.missingVariables = missingVariables
  }
}
