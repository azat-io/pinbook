import { describe, expect, it } from 'vitest'

import { pinColorSchema } from '../../schema/pin-color-schema'

describe('pinColorSchema', () => {
  it('parses shade-aware color ids', () => {
    expect(pinColorSchema.parse('red-500')).toBe('red-500')
    expect(pinColorSchema.parse('deep-purple-800')).toBe('deep-purple-800')
  })

  it('rejects bare color ids without an explicit shade', () => {
    expect(pinColorSchema.safeParse('red')).toMatchObject({
      success: false,
    })
    expect(pinColorSchema.safeParse('deep-purple')).toMatchObject({
      success: false,
    })
  })

  it('rejects unsupported color values', () => {
    expect(pinColorSchema.safeParse('black-500')).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            code: 'invalid_value',
          }),
        ],
      },
      success: false,
    })
  })
})
