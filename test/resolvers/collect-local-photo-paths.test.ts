import { describe, expect, it } from 'vitest'

import { collectLocalPhotoPaths } from '../../resolvers/collect-local-photo-paths'

describe('collectLocalPhotoPaths', () => {
  it('returns an empty set when no photo values are present', () => {
    expect(
      collectLocalPhotoPaths({
        pins: [
          {
            coords: [35.0116, 135.7681],
            icon: 'shapes-pin',
            color: 'red-500',
            title: 'Kyoto',
            id: 'kyoto',
          },
        ],
        map: {
          title: 'Japan',
        },
        layers: [],
      }),
    ).toEqual(new Set())
  })

  it('collects only unique local photo paths', () => {
    expect(
      collectLocalPhotoPaths({
        pins: [
          {
            photo: './photos/kyoto.jpg',
            coords: [35.0116, 135.7681],
            icon: 'shapes-pin',
            color: 'red-500',
            title: 'Kyoto',
            id: 'kyoto',
          },
          {
            photo: [
              'https://example.com/kyoto.jpg',
              './photos/kyoto.jpg',
              './photos/osaka.jpg',
            ],
            coords: [34.6937, 135.5023],
            icon: 'shapes-pin',
            color: 'red-500',
            title: 'Osaka',
            id: 'osaka',
          },
        ],
        map: {
          title: 'Japan',
        },
        layers: [],
      }),
    ).toEqual(new Set(['./photos/kyoto.jpg', './photos/osaka.jpg']))
  })
})
