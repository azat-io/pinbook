import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

import { preparePhotoForGoogleDrive } from '../../resolvers/prepare-photo-for-google-drive'
import { LocalPhotoProcessingError } from '../../resolvers/local-photo-processing-error'

describe('preparePhotoForGoogleDrive', () => {
  it('converts a local image into a fixed-size WebP upload artifact', async () => {
    let sourceBuffer = await sharp({
      create: {
        background: {
          g: 120,
          b: 220,
          r: 20,
        },
        height: 1000,
        width: 2000,
        channels: 3,
      },
    })
      .jpeg()
      .toBuffer()

    let preparedPhoto = await preparePhotoForGoogleDrive({
      photoPath: '/tmp/kyoto.jpg',
      buffer: sourceBuffer,
    })
    let metadata = await sharp(preparedPhoto.buffer).metadata()

    expect(preparedPhoto.uploadFileName).toBe('kyoto.webp')
    expect(preparedPhoto.hash).toBe(
      createHash('sha256').update(preparedPhoto.buffer).digest('hex'),
    )
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(1200)
    expect(metadata.height).toBe(800)
  })

  it('throws a typed error when the image cannot be processed', async () => {
    await expect(
      preparePhotoForGoogleDrive({
        buffer: Buffer.from('not-an-image'),
        photoPath: '/tmp/broken.jpg',
      }),
    ).rejects.toMatchObject({
      name: 'LocalPhotoProcessingError',
      photoPath: '/tmp/broken.jpg',
    })
  })

  it('uses a webp extension even when the source file has no extension', async () => {
    let sourceBuffer = await sharp({
      create: {
        background: {
          g: 120,
          b: 220,
          r: 20,
        },
        height: 1000,
        width: 2000,
        channels: 3,
      },
    })
      .png()
      .toBuffer()

    let preparedPhoto = await preparePhotoForGoogleDrive({
      photoPath: '/tmp/kyoto',
      buffer: sourceBuffer,
    })

    expect(preparedPhoto.uploadFileName).toBe('kyoto.webp')
  })

  it('falls back to a generic error suffix when the cause has no message', () => {
    expect(new LocalPhotoProcessingError('/tmp/kyoto.jpg', null).message).toBe(
      'Local photo processing failed for /tmp/kyoto.jpg.',
    )
  })
})
