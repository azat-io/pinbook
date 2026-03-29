import { z } from 'zod'

/**
 * Top-level metadata that describes the map itself.
 */
export let mapMetaSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Optional human-readable description of the map'),
    title: z.string().trim().min(1).describe('Human-readable title of the map'),
  })
  .strict()
  .describe('Top-level metadata that describes the map itself')
