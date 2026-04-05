import { afterEach, describe, expect, it } from 'vitest'
import * as fsPromises from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { readLocalPhoto } from '../../resolvers/read-local-photo'

let temporaryDirectories: string[] = []

async function createTemporaryDirectory(): Promise<string> {
  let temporaryDirectory = await fsPromises.mkdtemp(
    join(tmpdir(), 'pinbook-local-photo-'),
  )

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('readLocalPhoto', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        fsPromises.rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
  })

  it('reads a local photo and computes its SHA-256 hash', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let photoPath = join(temporaryDirectory, 'kyoto.jpg')
    let buffer = Buffer.from('kyoto-photo')

    await fsPromises.writeFile(photoPath, buffer)

    await expect(readLocalPhoto(photoPath)).resolves.toEqual({
      hash: createHash('sha256').update(buffer).digest('hex'),
      buffer,
    })
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
