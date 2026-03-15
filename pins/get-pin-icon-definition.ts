import { icons } from '../data/icons'

type PinIconDefinition = (typeof icons)[number]
type PinIconId = PinIconDefinition['id']

let pinIconsById = Object.fromEntries(
  icons.map(icon => [icon.id, icon]),
) as Record<PinIconId, PinIconDefinition>

/**
 * Fallback icon used when unchecked callers provide an unknown id.
 */
let fallbackPinIconId: PinIconId = 'shapes-pin'

/**
 * Resolves a pin icon id to full metadata.
 *
 * Unknown values fall back to the default My Maps pin to keep serializer
 * behavior stable for unchecked callers.
 *
 * @param icon - Pin icon id.
 * @returns Resolved icon definition.
 */
export function getPinIconDefinition(icon: string): PinIconDefinition {
  if (icon in pinIconsById) {
    return pinIconsById[icon as PinIconId]
  }

  return pinIconsById[fallbackPinIconId]
}
