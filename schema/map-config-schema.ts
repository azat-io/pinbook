import { z } from 'zod'

import { mapMetaSchema } from './map-meta-schema'
import { layerSchema } from './layer-schema'
import { pinSchema } from './pin-schema'

/**
 * Root configuration object for a map definition.
 */
export let mapConfigSchema = z
  .object({
    layers: z
      .array(layerSchema)
      .default([])
      .describe('Optional list of logical layers used to organize pins'),
    pins: z
      .array(pinSchema)
      .min(1)
      .describe('List of pins that should be rendered on the map'),
    map: mapMetaSchema.describe(
      'Map-level metadata such as title and description',
    ),
  })
  .strict()
  .superRefine((config, context) => {
    let layerIds = new Set<string>()
    let pinIds = new Set<string>()

    for (let [index, layer] of config.layers.entries()) {
      if (layerIds.has(layer.id)) {
        context.addIssue({
          message: `Layer id must be unique: ${layer.id}`,
          path: ['layers', index, 'id'],
          code: z.ZodIssueCode.custom,
        })
      }

      layerIds.add(layer.id)
    }

    for (let [index, pin] of config.pins.entries()) {
      if (pinIds.has(pin.id)) {
        context.addIssue({
          message: `Pin id must be unique: ${pin.id}`,
          code: z.ZodIssueCode.custom,
          path: ['pins', index, 'id'],
        })
      }

      pinIds.add(pin.id)

      if (pin.layer && !layerIds.has(pin.layer)) {
        context.addIssue({
          message: `Unknown layer id: ${pin.layer}`,
          path: ['pins', index, 'layer'],
          code: z.ZodIssueCode.custom,
        })
      }
    }
  })
  .describe('Root configuration object for a map definition')

/**
 * Root configuration object for a map definition.
 */
export type MapConfigSchema = z.infer<typeof mapConfigSchema>
