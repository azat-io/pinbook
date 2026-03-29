import { describe, expect, it } from 'vitest'

import { layerSchema } from '../../schema/layer-schema'

describe('layerSchema', () => {
  it('parses a valid layer', () => {
    expect(
      layerSchema.parse({
        description: 'Places to visit',
        title: 'Sights',
        id: 'sights',
      }),
    ).toEqual({
      description: 'Places to visit',
      title: 'Sights',
      id: 'sights',
    })
  })

  it('allows omitting an optional description', () => {
    expect(
      layerSchema.parse({
        title: 'Food',
        id: 'food',
      }),
    ).toEqual({
      title: 'Food',
      id: 'food',
    })
  })

  it('trims surrounding whitespace from string fields', () => {
    expect(
      layerSchema.parse({
        description: ' Places to visit ',
        title: ' Sights ',
        id: ' sights ',
      }),
    ).toEqual({
      description: 'Places to visit',
      title: 'Sights',
      id: 'sights',
    })
  })

  it('rejects unknown properties', () => {
    expect(
      layerSchema.safeParse({
        title: 'Food',
        slug: 'food',
        id: 'food',
      }),
    ).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            code: 'unrecognized_keys',
            keys: ['slug'],
          }),
        ],
      },
      success: false,
    })
  })
})
