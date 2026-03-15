import type { PinColorSchema } from '../schema/pin-color-schema'
import type { PinIconSchema } from '../schema/pin-icon-schema'

import { getStyleKey } from './get-style-key'
import { toKmlColor } from './to-kml-color'

/**
 * Google My Maps-compatible base icon URL used across exported style
 * definitions.
 */
let googleMyMapsBaseIconHref =
  'https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png'

/**
 * Renders a single Google My Maps-compatible style block for a pin color and
 * icon.
 *
 * @param color - Semantic pin color value.
 * @param icon - Semantic pin icon value.
 * @returns KML style markup.
 */
export function renderStyle(
  color: PinColorSchema,
  icon: PinIconSchema,
): string {
  let styleKey = getStyleKey(color, icon)
  let normalStyleKey = `${styleKey}-normal`
  let highlightStyleKey = `${styleKey}-highlight`
  let lines = [
    `<Style id="${normalStyleKey}">`,
    '  <IconStyle>',
    `    <color>${toKmlColor(color)}</color>`,
    '    <scale>1</scale>',
    '    <Icon>',
    `      <href>${googleMyMapsBaseIconHref}</href>`,
    '    </Icon>',
    '  </IconStyle>',
    '  <LabelStyle>',
    '    <scale>0</scale>',
    '  </LabelStyle>',
    '</Style>',
    `<Style id="${highlightStyleKey}">`,
    '  <IconStyle>',
    `    <color>${toKmlColor(color)}</color>`,
    '    <scale>1</scale>',
    '    <Icon>',
    `      <href>${googleMyMapsBaseIconHref}</href>`,
    '    </Icon>',
    '  </IconStyle>',
    '  <LabelStyle>',
    '    <scale>1</scale>',
    '  </LabelStyle>',
    '</Style>',
    `<StyleMap id="${styleKey}">`,
    '  <Pair>',
    '    <key>normal</key>',
    `    <styleUrl>#${normalStyleKey}</styleUrl>`,
    '  </Pair>',
    '  <Pair>',
    '    <key>highlight</key>',
    `    <styleUrl>#${highlightStyleKey}</styleUrl>`,
    '  </Pair>',
    '</StyleMap>',
  ]

  return lines.join('\n')
}
