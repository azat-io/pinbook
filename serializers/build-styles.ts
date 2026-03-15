import type { ResolvedMapConfig } from '../types/resolved-map-config'

import { getStyleKey } from './get-style-key'
import { renderStyle } from './render-style'

/**
 * Builds the KML style section for all unique `(color, icon)` combinations in
 * the config.
 *
 * @param config - Validated map config to serialize.
 * @returns KML style markup for all unique pin styles.
 */
export function buildStyles(config: ResolvedMapConfig): string {
  let styles = new Map<
    string,
    {
      color: ResolvedMapConfig['pins'][number]['color']
      icon: ResolvedMapConfig['pins'][number]['icon']
    }
  >()

  for (let pin of config.pins) {
    styles.set(getStyleKey(pin.color, pin.icon), {
      color: pin.color,
      icon: pin.icon,
    })
  }

  return [...styles.values()]
    .map(({ color, icon }) => renderStyle(color, icon))
    .join('\n')
}
