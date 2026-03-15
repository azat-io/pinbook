import { z } from 'zod'

import { icons } from '../data/icons'

let pinIconIds = icons.map(icon => icon.id) as [
  (typeof icons)[number]['id'],
  ...(typeof icons)[number]['id'][],
]

/**
 * Supported pin icon values.
 */
export let pinIconSchema = z
  .enum(pinIconIds)
  .describe('Supported pin icon values')

export type PinIconSchema = z.infer<typeof pinIconSchema>
