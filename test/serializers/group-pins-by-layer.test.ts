import { describe, expect, it } from 'vitest'

import {
  serializerConfig,
  missingLayerPin,
  pinWithoutLayer,
  sightsPin,
  foodPin,
} from './fixtures'
import { groupPinsByLayer } from '../../serializers/group-pins-by-layer'

describe('groupPinsByLayer', () => {
  it('groups pins by their layer identifier', () => {
    let groupedPins = groupPinsByLayer(serializerConfig)

    expect(groupedPins.get('sights')).toEqual([sightsPin])
    expect(groupedPins.get('food')).toEqual([foodPin])
    expect(groupedPins.get('missing')).toEqual([missingLayerPin])
    expect(groupedPins.get(undefined)).toEqual([pinWithoutLayer])
  })
})
