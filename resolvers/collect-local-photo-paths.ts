import type { ResolvedMapConfig } from '../types/resolved-map-config'

import { isPublicPhotoUrl } from '../pins/is-public-photo-url'

/**
 * Collects the unique local photo paths referenced by the resolved config.
 *
 * @param config - Resolved map config whose photos may contain local paths.
 * @returns Set of absolute local photo paths that need Drive uploads.
 */
export function collectLocalPhotoPaths(config: ResolvedMapConfig): Set<string> {
  let localPhotoPaths = new Set<string>()

  for (let pin of config.pins) {
    if (!pin.photo) {
      continue
    }

    for (let photo of normalizePhotoSources(pin.photo)) {
      if (!isPublicPhotoUrl(photo)) {
        localPhotoPaths.add(photo)
      }
    }
  }

  return localPhotoPaths
}

/**
 * Normalizes the supported `photo` field into a list of sources.
 *
 * @param photo - Single photo source or list of sources.
 * @returns Normalized list of photo sources.
 */
function normalizePhotoSources(photo: string[] | string): string[] {
  return Array.isArray(photo) ? photo : [photo]
}
