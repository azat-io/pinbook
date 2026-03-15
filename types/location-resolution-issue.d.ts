/**
 * A single unresolved address entry collected during config resolution.
 */
export interface LocationResolutionIssue {
  /**
   * Raw address string that could not be resolved.
   */
  address: string

  /**
   * Stable identifier of the pin that failed resolution.
   */
  pinId: string
}
