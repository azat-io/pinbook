import { z } from 'zod'

/**
 * A logical group of pins on the map.
 */
export let layerSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Optional human-readable description of the layer'),
    id: z
      .string()
      .trim()
      .min(1)
      .describe('Stable unique identifier of the layer used in references'),
    title: z
      .string()
      .trim()
      .min(1)
      .describe('Human-readable title of the layer'),
  })
  .strict()
  .describe('A logical group of pins on the map')
