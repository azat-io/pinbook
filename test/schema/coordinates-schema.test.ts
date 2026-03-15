import { describe, expect, it } from 'vitest'

import { coordinatesSchema } from '../../schema/coordinates-schema'

describe('coordinatesSchema', () => {
  it('parses valid coordinates', () => {
    expect(coordinatesSchema.parse([40.7128, -74.006])).toEqual([
      40.7128, -74.006,
    ])
  })

  it('rejects non-numeric values', () => {
    expect(() =>
      coordinatesSchema.parse(['not-a-number', 'also-not-a-number']),
    ).toThrow(/Invalid input: expected number, received string/u)
  })

  it('rejects out-of-range latitude', () => {
    expect(coordinatesSchema.safeParse([100, 0])).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            message: 'Coordinates must be [lat, lng] within valid ranges',
            code: 'custom',
            path: [],
          }),
        ],
      },
      success: false,
    })
  })

  it('rejects out-of-range longitude', () => {
    expect(coordinatesSchema.safeParse([0, 200])).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            message: 'Coordinates must be [lat, lng] within valid ranges',
            code: 'custom',
            path: [],
          }),
        ],
      },
      success: false,
    })
  })
})
