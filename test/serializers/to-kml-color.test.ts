import { describe, expect, it } from 'vitest'

import { toGoogleMyMapsColor, toKmlColor } from '../../serializers/to-kml-color'

describe('toKmlColor', () => {
  it('converts shade-aware ids to KML notation', () => {
    expect(toKmlColor('orange-500')).toBe('ff0098ff')
    expect(toKmlColor('deep-purple-800')).toBe('ffa02745')
  })

  it('falls back to the default KML color for unknown values', () => {
    expect(toKmlColor('unknown' as never)).toBe('fff39621')
  })

  it('converts shade-aware ids to My Maps style id notation', () => {
    expect(toGoogleMyMapsColor('deep-purple-800')).toBe('4527A0')
  })
})
