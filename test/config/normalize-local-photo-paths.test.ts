import { describe, expect, it } from 'vitest'
import { join } from 'node:path'

import { normalizeLocalPhotoPaths } from '../../config/normalize-local-photo-paths'

describe('normalizeLocalPhotoPaths', () => {
  it('keeps pins without photos unchanged', () => {
    let pins: {
      photo?: string[] | string
      coords: [number, number]
      title: string
      id: string
    }[] = [
      {
        coords: [35.0116, 135.7681] as [number, number],
        title: 'Kyoto Station',
        id: 'kyoto-station',
      },
    ]

    expect(normalizeLocalPhotoPaths(pins, '/tmp/index.yaml')).toEqual(pins)
  })

  it('resolves local photo paths against the source config file and keeps public URLs unchanged', () => {
    expect(
      normalizeLocalPhotoPaths(
        [
          {
            coords: [35.0116, 135.7681] as [number, number],
            photo: './photos/kyoto-station.jpg',
            title: 'Kyoto Station',
            id: 'kyoto-station',
          },
          {
            photo: [
              'https://example.com/kyoto-station.jpg',
              './photos/kyoto-tower.jpg',
            ],
            coords: [35.0116, 135.7681] as [number, number],
            title: 'Kyoto Tower',
            id: 'kyoto-tower',
          },
        ],
        '/maps/japan/index.yaml',
      ),
    ).toEqual([
      {
        photo: join('/maps/japan', 'photos/kyoto-station.jpg'),
        coords: [35.0116, 135.7681],
        title: 'Kyoto Station',
        id: 'kyoto-station',
      },
      {
        photo: [
          'https://example.com/kyoto-station.jpg',
          join('/maps/japan', 'photos/kyoto-tower.jpg'),
        ],
        coords: [35.0116, 135.7681],
        title: 'Kyoto Tower',
        id: 'kyoto-tower',
      },
    ])
  })
})
