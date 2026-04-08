/**
 * Progress events emitted while uncached addresses are geocoded.
 */
export type ResolveConfigProgressEvent =
  | {
      /**
       * Signals that one uncached address has finished geocoding.
       */
      type: 'geocoding-progress'

      /**
       * Number of addresses geocoded so far.
       */
      completed: number

      /**
       * Raw address string that just finished geocoding.
       */
      address: string

      /**
       * Total number of unique uncached addresses being geocoded.
       */
      total: number
    }
  | {
      /**
       * Signals that geocoding work is about to begin.
       */
      type: 'geocoding-start'

      /**
       * Total number of unique uncached addresses that require geocoding.
       */
      total: number
    }

/**
 * Options that control how config resolution loads cached coordinates.
 */
export interface ResolveConfigOptions {
  /**
   * Optional callback invoked while uncached addresses are being geocoded.
   */
  onProgress?(event: ResolveConfigProgressEvent): void

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
