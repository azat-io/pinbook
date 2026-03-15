/**
 * Options that control how config resolution loads cached coordinates.
 */
export interface ResolveConfigOptions {
  /**
   * Optional Google Maps API key used to geocode uncached addresses during
   * config resolution.
   */
  googleMapsApiKey?: string

  /**
   * Optional override for the resolution cache JSON file path.
   */
  cachePath?: string
}
