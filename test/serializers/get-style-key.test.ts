import { describe, expect, it } from 'vitest'

import { getStyleKey } from '../../serializers/get-style-key'

describe('getStyleKey', () => {
  it('builds a Google My Maps-compatible style key from color and icon', () => {
    expect(getStyleKey('deep-purple-800', 'places-museum')).toBe(
      'icon-1636-4527A0',
    )
  })
})
