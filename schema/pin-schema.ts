import { z } from 'zod'

import { isSupportedPhotoSource } from '../pins/is-supported-photo-source'
import { coordinatesSchema } from './coordinates-schema'
import { pinColorSchema } from './pin-color-schema'
import { pinIconSchema } from './pin-icon-schema'

let nonEmptyTrimmedStringSchema = z.string().trim().min(1)
let photoSourceSchema = z
  .string()
  .trim()
  .min(1)
  .refine(value => isSupportedPhotoSource(value), {
    message:
      'Photo must be a full http:// or https:// URL or a local file path',
  })

/**
 * A single point of interest shown on the map.
 */
export let pinSchema = z
  .object({
    photo: z
      .union([photoSourceSchema, z.array(photoSourceSchema).min(1)])
      .optional()
      .describe(
        'Optional public photo URL, local file path, or list of photo sources associated with the pin',
      ),
    address: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'Optional human-readable address that can be resolved to coordinates',
      ),
    description: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Optional human-readable description of the pin'),
    layer: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Optional layer identifier this pin belongs to'),
    id: nonEmptyTrimmedStringSchema.describe(
      'Stable unique identifier of the pin used in references',
    ),
    coords: coordinatesSchema
      .optional()
      .describe('Optional geographic coordinates of the pin'),
    icon: pinIconSchema
      .default('shapes-pin')
      .describe('Google My Maps icon used for the pin'),
    color: pinColorSchema
      .default('red-500')
      .describe('Visual color used for the pin'),
    title: nonEmptyTrimmedStringSchema.describe(
      'Human-readable title of the pin',
    ),
  })
  .strict()
  .superRefine((pin, context) => {
    if (pin.address || pin.coords) {
      return
    }

    context.addIssue({
      message: 'Pin must include either coords or address',
      code: z.ZodIssueCode.custom,
      path: ['coords'],
    })
  })
  .describe('A single point of interest shown on the map')

export type PinSchema = z.infer<typeof pinSchema>
