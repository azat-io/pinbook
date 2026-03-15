import { z } from 'zod'

import { colors } from '../data/colors'

/**
 * Canonical shade-aware color id in `color-tone` format.
 */
type PinColorShadeId = `${PinColorId}-${PinColorTone}`

/**
 * Supported tone value for a normalized color definition.
 */
type PinColorTone = keyof PinColorDefinition['tones']

/**
 * Single normalized color definition from the palette registry.
 */
type PinColorDefinition = (typeof colors)[number]

/**
 * Stable color family identifier, for example `red` or `deep-purple`.
 */
type PinColorId = PinColorDefinition['id']

let pinColorIds = colors.flatMap(color =>
  Object.keys(color.tones).map(tone => `${color.id}-${tone}`),
) as [PinColorShadeId, ...PinColorShadeId[]]

/**
 * Supported pin color values in `color-tone` format, for example `red-500` or
 * `deep-purple-800`.
 */
export let pinColorSchema = z
  .enum(pinColorIds)
  .describe('Supported pin color values')

/**
 * Parsed pin color value accepted by the runtime schema.
 */
export type PinColorSchema = z.infer<typeof pinColorSchema>
