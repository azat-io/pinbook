import { describe, expect, it } from 'vitest'

import { getMimeType } from '../../resolvers/get-mime-type'

describe('getMimeType', () => {
  it('should return correct MIME type for supported extensions', () => {
    expect(getMimeType('photo.jpg')).toBe('image/jpeg')
    expect(getMimeType('photo.jpeg')).toBe('image/jpeg')
    expect(getMimeType('photo.png')).toBe('image/png')
    expect(getMimeType('photo.gif')).toBe('image/gif')
    expect(getMimeType('photo.bmp')).toBe('image/bmp')
    expect(getMimeType('photo.webp')).toBe('image/webp')
    expect(getMimeType('photo.tiff')).toBe('image/tiff')
    expect(getMimeType('photo.tif')).toBe('image/tiff')
    expect(getMimeType('photo.avif')).toBe('image/avif')
    expect(getMimeType('photo.heic')).toBe('image/heic')
    expect(getMimeType('photo.heif')).toBe('image/heif')
    expect(getMimeType('photo.svg')).toBe('image/svg+xml')
  })

  it('should return application/octet-stream for unsupported extensions', () => {
    expect(getMimeType('photo.txt')).toBe('application/octet-stream')
    expect(getMimeType('photo.pdf')).toBe('application/octet-stream')
    expect(getMimeType('photo.docx')).toBe('application/octet-stream')
  })

  it('should handle uppercase extensions', () => {
    expect(getMimeType('PHOTO.JPG')).toBe('image/jpeg')
    expect(getMimeType('PHOTO.PNG')).toBe('image/png')
    expect(getMimeType('PHOTO.GIF')).toBe('image/gif')
  })
})
