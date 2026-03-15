import type { ResolvedMapConfig } from '../types/resolved-map-config'
import type { ResolvedPin } from '../types/resolved-pin'

/**
 * Groups pins by their assigned layer identifier.
 *
 * @param config - Validated map config containing pins to group.
 * @returns Map of layer identifiers to their corresponding pins.
 */
export function groupPinsByLayer(
  config: ResolvedMapConfig,
): Map<undefined | string, ResolvedPin[]> {
  let map = new Map<undefined | string, ResolvedPin[]>()

  for (let pin of config.pins) {
    let pins = map.get(pin.layer) ?? []
    pins.push(pin)
    map.set(pin.layer, pins)
  }

  return map
}
