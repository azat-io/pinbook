import type { PinColorSchema } from '../schema/pin-color-schema'

import { getPinColorHex } from '../pins/get-pin-color-hex'

/**
 * Converts a semantic pin color into KML `aabbggrr` color notation.
 *
 * @param color - Semantic pin color value.
 * @returns KML color string.
 */
export function toKmlColor(color: PinColorSchema): string {
  let hex = getPinColorHex(color).slice(1)

  return `ff${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}`.toLowerCase()
}

/**
 * Converts a semantic pin color into the uppercase `RRGGBB` format used by
 * Google My Maps style ids.
 *
 * @param color - Semantic pin color value.
 * @returns Color string in `RRGGBB` format.
 */
export function toGoogleMyMapsColor(color: PinColorSchema): string {
  return getPinColorHex(color).slice(1).toUpperCase()
}
