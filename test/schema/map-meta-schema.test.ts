import { describe, expect, it } from 'vitest'

import { mapMetaSchema } from '../../schema/map-meta-schema'

describe('mapMetaSchema', () => {
  it('parses valid map metadata', () => {
    expect(
      mapMetaSchema.parse({
        description: 'Spring itinerary',
        title: 'Kyoto 2026',
      }),
    ).toEqual({
      description: 'Spring itinerary',
      title: 'Kyoto 2026',
    })
  })

  it('rejects an empty title', () => {
    expect(mapMetaSchema.safeParse({ title: '' })).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            code: 'too_small',
            path: ['title'],
          }),
        ],
      },
      success: false,
    })
  })
})
