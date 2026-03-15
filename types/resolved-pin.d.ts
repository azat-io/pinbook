import type { CoordinatesSchema } from '../schema/coordinates-schema'
import type { PinSchema } from '../schema/pin-schema'

/**
 * A pin whose geographic coordinates are guaranteed to be available.
 */
export interface ResolvedPin extends Omit<PinSchema, 'coords'> {
  /**
   * Resolved geographic coordinates in `[lat, lng]` format.
   */
  coords: CoordinatesSchema
}
