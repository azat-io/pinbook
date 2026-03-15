import { describe, expect, it } from 'vitest'

import { colors } from '../../data/colors'

describe('colors', () => {
  it('stores the normalized Google Material UI palette subset', () => {
    expect(colors).toHaveLength(18)
    expect(colors[0]).toEqual({
      tones: {
        400: '#ef5350',
        500: '#f44336',
        600: '#e53935',
        700: '#d32f2f',
        800: '#c62828',
        900: '#b71c1c',
      },
      name: 'Red',
      id: 'red',
    })
  })

  it('keeps only tones 400 through 900 for each color', () => {
    expect(Object.keys(colors[0].tones)).toEqual([
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
    ])
  })
})
