import type { ResolvedMapConfig } from '../../../types/resolved-map-config'

export let serializerConfig: ResolvedMapConfig = {
  pins: [
    {
      description: 'Torii <gates> & crowds',
      coords: [34.9671, 135.7727],
      title: 'Fushimi & Inari',
      icon: 'places-viewpoint',
      id: 'fushimi-inari',
      color: 'red-500',
      layer: 'sights',
    },
    {
      title: 'Kyoto "Station"',
      icon: 'places-viewpoint',
      coords: [35, 135.758],
      id: 'kyoto-station',
      color: 'red-500',
    },
    {
      icon: 'places-restaurant',
      coords: [35.001, 135.76],
      title: 'Ramen > Spot',
      color: 'orange-500',
      layer: 'food',
      id: 'ramen',
    },
    {
      description: "Hidden's & rare",
      title: 'Mystery <Place>',
      coords: [35.01, 135.77],
      icon: 'places-museum',
      color: 'purple-500',
      layer: 'missing',
      id: 'mystery',
    },
  ],
  layers: [
    {
      description: 'Top <places> & views',
      title: 'Sights & Views',
      id: 'sights',
    },
    {
      title: 'Food Stops',
      id: 'food',
    },
  ],
  map: {
    description: 'Spring <trip> & notes',
    title: 'Kyoto & Osaka',
  },
}

type SerializerPin = (typeof serializerConfig.pins)[number]

export let [sightsPin, pinWithoutLayer, foodPin, missingLayerPin] =
  serializerConfig.pins as [
    SerializerPin,
    SerializerPin,
    SerializerPin,
    SerializerPin,
  ]
