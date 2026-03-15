import { describe, expect, it } from 'vitest'

import { pinIconSchema } from '../../schema/pin-icon-schema'

describe('pinIconSchema', () => {
  it('parses supported icon values', () => {
    expect(pinIconSchema.parse('shapes-pin')).toBe('shapes-pin')
    expect(pinIconSchema.parse('places-museum')).toBe('places-museum')
    expect(pinIconSchema.parse('transportation-airport')).toBe(
      'transportation-airport',
    )
  })

  it('rejects unsupported icon values', () => {
    expect(pinIconSchema.safeParse('airport')).toMatchObject({
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
