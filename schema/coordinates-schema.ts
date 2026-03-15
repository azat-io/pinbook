import { z } from 'zod'

/**
 * Geographic coordinates in `[lat, lng]` format.
 */
export let coordinatesSchema = z
  .tuple([z.number(), z.number()])
  .describe('Geographic coordinates in [lat, lng] format')
  .refine(
    ([lat, lng]) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180,
    'Coordinates must be [lat, lng] within valid ranges',
  )

export type CoordinatesSchema = z.infer<typeof coordinatesSchema>
