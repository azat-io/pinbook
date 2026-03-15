import { describe, expect, it } from 'vitest'

import { getPinIconDefinition } from '../../pins/get-pin-icon-definition'

describe('getPinIconDefinition', () => {
  it('resolves known icon slugs to their metadata', () => {
    expect(getPinIconDefinition('places-museum')).toEqual({
      id: 'places-museum',
      category: 'Places',
      name: 'Museum',
      code: '1636',
    })
  })

  it('falls back to the default icon for unknown slugs', () => {
    expect(getPinIconDefinition('unknown').id).toBe('shapes-pin')
  })
})
