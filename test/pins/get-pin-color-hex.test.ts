import { describe, expect, it } from 'vitest'

import { getPinColorHex } from '../../pins/get-pin-color-hex'

describe('getPinColorHex', () => {
  it('resolves shade-aware color ids to the requested palette tone', () => {
    expect(getPinColorHex('red-500')).toBe('#f44336')
    expect(getPinColorHex('deep-purple-800')).toBe('#4527a0')
  })

  it('falls back to the default tone when a known color uses an unsupported shade', () => {
    expect(getPinColorHex('deep-purple-950')).toBe('#673ab7')
  })

  it('falls back to the default blue color for invalid ids', () => {
    expect(getPinColorHex('orange')).toBe('#2196f3')
    expect(getPinColorHex('unknown')).toBe('#2196f3')
    expect(getPinColorHex('black-500')).toBe('#2196f3')
  })
})
