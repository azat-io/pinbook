import { describe, expect, it } from 'vitest'

import { pinSchema } from '../../schema/pin-schema'

describe('pinSchema', () => {
  it('parses a minimal valid pin and applies defaults', () => {
    expect(
      pinSchema.parse({
        coords: [35.0116, 135.7681],
        title: 'Kyoto Station',
        id: 'kyoto-station',
      }),
    ).toEqual({
      coords: [35.0116, 135.7681],
      title: 'Kyoto Station',
      id: 'kyoto-station',
      icon: 'shapes-pin',
      color: 'red-500',
    })
  })

  it('parses a pin with an address instead of explicit coordinates', () => {
    expect(
      pinSchema.parse({
        address: 'Tokyo Station, Tokyo',
        title: 'Tokyo Station',
        id: 'tokyo-station',
      }),
    ).toEqual({
      address: 'Tokyo Station, Tokyo',
      title: 'Tokyo Station',
      id: 'tokyo-station',
      icon: 'shapes-pin',
      color: 'red-500',
    })
  })

  it('parses a fully populated pin', () => {
    expect(
      pinSchema.parse({
        description: 'Best visited early in the morning',
        photo: 'https://example.com/photos/fushimi.jpg',
        address: 'Fushimi Inari, Kyoto',
        coords: [34.9671, 135.7727],
        icon: 'places-viewpoint',
        title: 'Fushimi Inari',
        id: 'fushimi-inari',
        color: 'orange-500',
        layer: 'sights',
      }),
    ).toEqual({
      description: 'Best visited early in the morning',
      photo: 'https://example.com/photos/fushimi.jpg',
      address: 'Fushimi Inari, Kyoto',
      coords: [34.9671, 135.7727],
      icon: 'places-viewpoint',
      title: 'Fushimi Inari',
      id: 'fushimi-inari',
      color: 'orange-500',
      layer: 'sights',
    })
  })

  it('parses a pin with multiple photos', () => {
    expect(
      pinSchema.parse({
        photo: [
          'https://example.com/photos/fushimi-front.jpg',
          'https://example.com/photos/fushimi-gate.jpg',
        ],
        coords: [34.9671, 135.7727],
        title: 'Fushimi Inari',
        id: 'fushimi-inari',
      }),
    ).toEqual({
      photo: [
        'https://example.com/photos/fushimi-front.jpg',
        'https://example.com/photos/fushimi-gate.jpg',
      ],
      coords: [34.9671, 135.7727],
      title: 'Fushimi Inari',
      id: 'fushimi-inari',
      icon: 'shapes-pin',
      color: 'red-500',
    })
  })

  it('trims surrounding whitespace from string fields', () => {
    expect(
      pinSchema.parse({
        description: ' Best visited early in the morning ',
        photo: ' https://example.com/photos/fushimi.jpg ',
        address: ' Fushimi Inari, Kyoto ',
        coords: [34.9671, 135.7727],
        title: ' Fushimi Inari ',
        id: ' fushimi-inari ',
        layer: ' sights ',
      }),
    ).toEqual({
      description: 'Best visited early in the morning',
      photo: 'https://example.com/photos/fushimi.jpg',
      address: 'Fushimi Inari, Kyoto',
      coords: [34.9671, 135.7727],
      title: 'Fushimi Inari',
      id: 'fushimi-inari',
      icon: 'shapes-pin',
      color: 'red-500',
      layer: 'sights',
    })
  })

  it('rejects unknown properties', () => {
    expect(
      pinSchema.safeParse({
        coords: [35.0116, 135.7681],
        title: 'Kyoto Station',
        slug: 'kyoto-station',
        id: 'kyoto-station',
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

  it('rejects whitespace-only required strings', () => {
    expect(
      pinSchema.safeParse({
        coords: [35.0116, 135.7681],
        id: 'kyoto-station',
        title: '   ',
      }),
    ).toMatchObject({
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

  it('rejects pins without coords and address', () => {
    expect(
      pinSchema.safeParse({
        title: 'Kyoto Station',
        id: 'kyoto-station',
      }),
    ).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            message: 'Pin must include either coords or address',
            path: ['coords'],
            code: 'custom',
          }),
        ],
      },
      success: false,
    })
  })

  it('parses local photo paths', () => {
    expect(
      pinSchema.parse({
        photo: './photos/kyoto-station.jpg',
        coords: [35.0116, 135.7681],
        title: 'Kyoto Station',
        id: 'kyoto-station',
      }),
    ).toEqual({
      photo: './photos/kyoto-station.jpg',
      coords: [35.0116, 135.7681],
      title: 'Kyoto Station',
      id: 'kyoto-station',
      icon: 'shapes-pin',
      color: 'red-500',
    })
  })

  it('parses local photo paths inside a photo list', () => {
    expect(
      pinSchema.parse({
        photo: [
          'https://example.com/photos/kyoto-station.jpg',
          './photos/kyoto-station.jpg',
        ],
        coords: [35.0116, 135.7681],
        title: 'Kyoto Station',
        id: 'kyoto-station',
      }),
    ).toEqual({
      photo: [
        'https://example.com/photos/kyoto-station.jpg',
        './photos/kyoto-station.jpg',
      ],
      coords: [35.0116, 135.7681],
      title: 'Kyoto Station',
      id: 'kyoto-station',
      icon: 'shapes-pin',
      color: 'red-500',
    })
  })

  it('rejects unsupported photo URL schemes', () => {
    expect(
      pinSchema.safeParse({
        photo: 'file:///tmp/kyoto-station.jpg',
        coords: [35.0116, 135.7681],
        title: 'Kyoto Station',
        id: 'kyoto-station',
      }),
    ).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            message:
              'Photo must be a full http:// or https:// URL or a local file path',
            path: ['photo'],
          }),
        ],
      },
      success: false,
    })
  })
})
