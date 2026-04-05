import { describe, expect, it } from 'vitest'

import { replaceLocalPhotosWithPublicUrls } from '../../resolvers/replace-local-photos-with-public-urls'

describe('replaceLocalPhotosWithPublicUrls', () => {
  it('replaces a single local photo path with its public URL', () => {
    expect(
      replaceLocalPhotosWithPublicUrls('./photos/kyoto.jpg', {
        './photos/kyoto.jpg': 'https://drive.example/kyoto.jpg',
      }),
    ).toBe('https://drive.example/kyoto.jpg')
  })

  it('keeps public URLs unchanged and rewrites local entries inside arrays', () => {
    expect(
      replaceLocalPhotosWithPublicUrls(
        ['https://example.com/kyoto.jpg', './photos/osaka.jpg'],
        {
          './photos/osaka.jpg': 'https://drive.example/osaka.jpg',
        },
      ),
    ).toEqual([
      'https://example.com/kyoto.jpg',
      'https://drive.example/osaka.jpg',
    ])
  })

  it('keeps a local path unchanged when no public URL mapping exists', () => {
    expect(replaceLocalPhotosWithPublicUrls('./photos/missing.jpg', {})).toBe(
      './photos/missing.jpg',
    )
  })
})
