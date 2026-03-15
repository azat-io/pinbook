import { colors } from '../data/colors'

/**
 * Regex capture groups extracted from a `color-tone` pin color id.
 */
interface PinColorWithToneMatchGroups {
  /**
   * Matched color family identifier, for example `red` or `deep-purple`.
   */
  colorId?: string

  /**
   * Matched numeric tone identifier, for example `500` or `800`.
   */
  tone?: string
}
type PinColorTone = keyof PinColorDefinition['tones']
type PinColorDefinition = (typeof colors)[number]
type PinColorId = PinColorDefinition['id']

let defaultPinColorTone: PinColorTone = 500

let pinColorsById = Object.fromEntries(
  colors.map(color => [color.id, color]),
) as Record<PinColorId, PinColorDefinition>

let pinColorWithTonePattern = /^(?<colorId>.+)-(?<tone>\d+)$/u

/**
 * Fallback color used when unchecked callers provide an unknown id.
 */
let fallbackPinColorId: PinColorId = 'blue'

/**
 * Resolves a pin color id to a hex value from the normalized palette.
 *
 * Unknown values fall back to the default blue tone to keep serializer behavior
 * stable for unchecked callers.
 *
 * @param color - Pin color id.
 * @returns Color value in `#RRGGBB` format.
 */
export function getPinColorHex(color: string): string {
  let colorWithToneMatch = color.match(pinColorWithTonePattern)

  if (colorWithToneMatch?.groups) {
    let { tone: toneValue, colorId } =
      colorWithToneMatch.groups as PinColorWithToneMatchGroups

    if (colorId && toneValue && colorId in pinColorsById) {
      let pinColorDefinition = pinColorsById[colorId as PinColorId]
      let tone = Number(toneValue) as PinColorTone

      if (tone in pinColorDefinition.tones) {
        return pinColorDefinition.tones[tone]
      }

      return pinColorDefinition.tones[defaultPinColorTone]
    }
  }

  return pinColorsById[fallbackPinColorId].tones[defaultPinColorTone]
}
