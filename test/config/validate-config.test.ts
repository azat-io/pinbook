import { describe, expect, it } from 'vitest'

import { validateConfig } from '../../config/validate-config'

describe('validateConfig', () => {
  it('returns normalized config for valid input', () => {
    expect(
      validateConfig({
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
      data: {
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
      },
      success: true,
    })
  })

  it('formats nested validation issues with dot-delimited paths', () => {
    expect(
      validateConfig({
        pins: [
          {
            title: 'Kyoto Station',
            id: 'kyoto-station',
          },
        ],
        map: {
          title: 'Kyoto 2026',
        },
      }),
    ).toMatchObject({
      issues: [
        {
          message: 'Pin must include either coords or address',
          path: 'pins.0.coords',
        },
      ],
      success: false,
    })
  })

  it('formats root-level validation issues as root', () => {
    expect(
      validateConfig({
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
      issues: [
        {
          message: 'Unrecognized key: "version"',
          path: 'root',
        },
      ],
      success: false,
    })
  })

  it('formats cross-field layer validation issues with nested paths', () => {
    expect(
      validateConfig({
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
      issues: [
        {
          message: 'Unknown layer id: stay',
          path: 'pins.0.layer',
        },
      ],
      success: false,
    })
  })
})
