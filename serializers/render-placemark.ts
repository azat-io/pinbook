import type { ResolvedPin } from '../types/resolved-pin'

import { PHOTO_RENDER_HEIGHT, PHOTO_RENDER_WIDTH } from '../constants'
import { getStyleKey } from './get-style-key'
import { escapeXml } from './escape-xml'

/**
 * Renders a single map pin as a KML placemark.
 *
 * @param pin - Pin to render as KML.
 * @returns KML placemark markup.
 */
export function renderPlacemark(pin: ResolvedPin): string {
  let lines = ['<Placemark>', `  <name>${escapeXml(pin.title)}</name>`]

  if (pin.photo) {
    let photoUrls = normalizePhotoUrls(pin.photo)
    let descriptionParts = photoUrls.map(
      photoUrl =>
        `<img src="${escapeXml(photoUrl)}" width="${PHOTO_RENDER_WIDTH}" height="${PHOTO_RENDER_HEIGHT}" />`,
    )
    let extendedDataLines = photoUrls.flatMap(photoUrl => [
      '    <Data name="gx_media_links">',
      `      <value>${wrapCdata(photoUrl)}</value>`,
      '    </Data>',
    ])

    if (pin.description) {
      descriptionParts.push(escapeXml(pin.description.trimEnd()))
    }

    lines.push(
      `  <description>${wrapCdata(descriptionParts.join('<br>'))}</description>`,
      '  <ExtendedData>',
      ...extendedDataLines,
      '  </ExtendedData>',
    )
  } else if (pin.description) {
    lines.push(
      `  <description>${escapeXml(pin.description.trimEnd())}</description>`,
    )
  }

  lines.push(
    `  <styleUrl>#${getStyleKey(pin.color, pin.icon)}</styleUrl>`,
    '  <Point>',
    `    <coordinates>${pin.coords[1]},${pin.coords[0]},0</coordinates>`,
    '  </Point>',
    '</Placemark>',
  )

  return lines.join('\n')
}

/**
 * Normalizes the supported `photo` field into a list of public image URLs.
 *
 * @param photo - Single photo URL or list of URLs.
 * @returns Normalized list of photo URLs.
 */
function normalizePhotoUrls(photo: string[] | string): string[] {
  return Array.isArray(photo) ? photo : [photo]
}

/**
 * Wraps arbitrary content in a CDATA section and safely splits nested `]]>`
 * sequences so the resulting XML remains well-formed.
 *
 * @param value - Raw text or HTML fragment to wrap.
 * @returns CDATA-wrapped content safe for XML serialization.
 */
function wrapCdata(value: string): string {
  return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`
}
