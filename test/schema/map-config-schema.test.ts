import { describe, expect, it } from 'vitest'

import { mapConfigSchema } from '../../schema/map-config-schema'

describe('mapConfigSchema', () => {
  it('parses a valid map config and applies defaults', () => {
    expect(
      mapConfigSchema.parse({
        pins: [
          {
            coords: [35.0116, 135.7681],
            title: 'Kyoto Station',
            id: 'kyoto-station',
          },
        ],
        map: {
          title: 'Kyoto 2026',
        },
      }),
    ).toEqual({
      pins: [
        {
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
      map: {
        title: 'Kyoto 2026',
      },
      layers: [],
    })
  })

  it('rejects an empty pins list', () => {
    expect(
      mapConfigSchema.safeParse({
        map: {
          title: 'Kyoto 2026',
        },
        pins: [],
      }),
    ).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            code: 'too_small',
            path: ['pins'],
          }),
        ],
      },
      success: false,
    })
  })

  it('rejects unknown root properties', () => {
    expect(
      mapConfigSchema.safeParse({
        pins: [
          {
            coords: [35.0116, 135.7681],
            title: 'Kyoto Station',
            id: 'kyoto-station',
          },
        ],
        map: {
          title: 'Kyoto 2026',
        },
        version: 1,
      }),
    ).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            code: 'unrecognized_keys',
            keys: ['version'],
          }),
        ],
      },
      success: false,
    })
  })

  it('rejects pins that reference an unknown layer id', () => {
    expect(
      mapConfigSchema.safeParse({
        pins: [
          {
            coords: [35.0116, 135.7681],
            title: 'Kyoto Station',
            id: 'kyoto-station',
            layer: 'stay',
          },
        ],
        layers: [
          {
            title: 'Food',
            id: 'food',
          },
        ],
        map: {
          title: 'Kyoto 2026',
        },
      }),
    ).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            message: 'Unknown layer id: stay',
            path: ['pins', 0, 'layer'],
            code: 'custom',
          }),
        ],
      },
      success: false,
    })
  })

  it('rejects duplicate layer ids', () => {
    expect(
      mapConfigSchema.safeParse({
        layers: [
          {
            title: 'Food',
            id: 'food',
          },
          {
            title: 'More Food',
            id: 'food',
          },
        ],
        pins: [
          {
            coords: [35.0116, 135.7681],
            title: 'Kyoto Station',
            id: 'kyoto-station',
          },
        ],
        map: {
          title: 'Kyoto 2026',
        },
      }),
    ).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            message: 'Layer id must be unique: food',
            path: ['layers', 1, 'id'],
            code: 'custom',
          }),
        ],
      },
      success: false,
    })
  })

  it('rejects duplicate pin ids', () => {
    expect(
      mapConfigSchema.safeParse({
        pins: [
          {
            coords: [35.0116, 135.7681],
            title: 'Kyoto Station',
            id: 'kyoto-station',
          },
          {
            coords: [35.0216, 135.7781],
            title: 'Kyoto Tower',
            id: 'kyoto-station',
          },
        ],
        map: {
          title: 'Kyoto 2026',
        },
      }),
    ).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            message: 'Pin id must be unique: kyoto-station',
            path: ['pins', 1, 'id'],
            code: 'custom',
          }),
        ],
      },
      success: false,
    })
  })
})
