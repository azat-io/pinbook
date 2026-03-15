import type { ResolvedMapConfig } from '../types/resolved-map-config'

import { buildFolders } from './build-folders'
import { buildStyles } from './build-styles'
import { indentBlock } from './indent-block'
import { escapeXml } from './escape-xml'

/**
 * Options that control how the KML document is generated.
 */
interface KmlExportOptions {
  /**
   * Whether to include the map description in the KML document description.
   */
  documentDescription?: boolean
}

/**
 * Serializes a validated map config into a KML document.
 *
 * @param config - Validated map config to serialize.
 * @param options - Export options that control optional KML sections.
 * @returns Full KML document as a string.
 */
export function exportKml(
  config: ResolvedMapConfig,
  options: KmlExportOptions = {},
): string {
  let styles = buildStyles(config)
  let folders = buildFolders(config)
  let documentBlocks = [styles, folders]
    .map(block => indentBlock(block, 4))
    .filter(block => block.trim() !== '')
  let lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '  <Document>',
    `    <name>${escapeXml(config.map.title)}</name>`,
    options.documentDescription && config.map.description ?
      `    <description>${escapeXml(
        config.map.description.trimEnd(),
      )}</description>`
    : '    <description/>',
    ...documentBlocks,
    '  </Document>',
    '</kml>',
  ]

  return lines.join('\n')
}
