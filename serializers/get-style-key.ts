import type { PinColorSchema } from '../schema/pin-color-schema'
import type { PinIconSchema } from '../schema/pin-icon-schema'

import { getPinIconDefinition } from '../pins/get-pin-icon-definition'
import { toGoogleMyMapsColor } from './to-kml-color'

/**
 * Builds a Google My Maps-compatible style map id from pin color and icon.
 *
 * @param color - Semantic pin color value.
 * @param icon - Semantic pin icon value.
 * @returns Style map id used by KML `StyleMap` and `styleUrl`.
 */
export function getStyleKey(
  color: PinColorSchema,
  icon: PinIconSchema,
): string {
  let iconDefinition = getPinIconDefinition(icon)

  return `icon-${iconDefinition.code}-${toGoogleMyMapsColor(color)}`
}
