import * as fsPromises from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'

import { createTemporaryDirectory } from '../helpers/create-temporary-directory'
import { readLocalPhoto } from '../../resolvers/read-local-photo'

describe('readLocalPhoto', () => {
  it('reads a local photo', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let photoPath = join(temporaryDirectory, 'kyoto.jpg')
    let buffer = Buffer.from('kyoto-photo')

    await fsPromises.writeFile(photoPath, buffer)

    await expect(readLocalPhoto(photoPath)).resolves.toEqual(buffer)
  })

  it('throws a typed error when the local file is missing', async () => {
    await expect(readLocalPhoto('/missing/kyoto.jpg')).rejects.toMatchObject({
      name: 'LocalPhotoFileNotFoundError',
      photoPath: '/missing/kyoto.jpg',
    })
  })

  it('rethrows unexpected file system errors', async () => {
    let temporaryDirectory = await createTemporaryDirectory()

    await expect(readLocalPhoto(temporaryDirectory)).rejects.toMatchObject({
      code: 'EISDIR',
    })
  })
})
