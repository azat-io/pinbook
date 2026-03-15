import type { MapConfigSchema } from '../schema/map-config-schema'
import type { ResolvedPin } from './resolved-pin'

/**
 * A map config whose pins are guaranteed to contain coordinates.
 */
export interface ResolvedMapConfig extends Omit<MapConfigSchema, 'pins'> {
  /**
   * List of pins with resolved coordinates.
   */
  pins: ResolvedPin[]
}
