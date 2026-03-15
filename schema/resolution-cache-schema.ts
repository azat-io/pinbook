import { z } from 'zod'

import { coordinatesSchema } from './coordinates-schema'

/**
 * Cache file that stores previously resolved addresses and their coordinates.
 */
export let resolutionCacheSchema = z
  .object({
    addresses: z
      .record(z.string(), coordinatesSchema)
      .default({})
      .describe(
        'Mapping of raw address strings to resolved geographic coordinates',
      ),
    version: z.literal(1).describe('Version of the resolution cache format'),
  })
  .strict()
  .describe(
    'Cache file that stores previously resolved addresses and their coordinates',
  )

export type ResolutionCacheSchema = z.infer<typeof resolutionCacheSchema>
