import type { ResolvedMapConfig } from '../types/resolved-map-config'

import { groupPinsByLayer } from './group-pins-by-layer'
import { renderPlacemark } from './render-placemark'
import { indentBlock } from './indent-block'
import { escapeXml } from './escape-xml'

/**
 * Builds KML folder markup for all configured layers and their pins.
 *
 * @param config - Validated map config to serialize.
 * @returns KML folder markup with placemarks grouped by layer.
 */
export function buildFolders(config: ResolvedMapConfig): string {
  let pinsByLayer = groupPinsByLayer(config)

  return [...pinsByLayer.entries()]
    .map(([layerId, pins]) => {
      let layer = config.layers.find(item => item.id === layerId)
      let placemarks = pins.map(pin => renderPlacemark(pin)).join('\n')

      if (!layerId || !layer) {
        return placemarks
      }

      let lines = ['<Folder>', `  <name>${escapeXml(layer.title)}</name>`]

      if (layer.description) {
        lines.push(
          `  <description>${escapeXml(
            layer.description.trimEnd(),
          )}</description>`,
        )
      }

      lines.push(indentBlock(placemarks, 2), '</Folder>')

      return lines.join('\n')
    })
    .join('\n')
}
