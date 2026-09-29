import type { Sharp } from 'sharp'

import sharp from 'sharp'

/**
 * Creates a solid-color 2000x1000 RGB image to use as a local photo in tests.
 *
 * @returns Sharp pipeline for the generated image.
 */
export function createTestImage(): Sharp {
  return sharp({
    create: {
      background: {
        g: 120,
        b: 220,
        r: 20,
      },
      height: 1000,
      width: 2000,
      channels: 3,
    },
  })
}
