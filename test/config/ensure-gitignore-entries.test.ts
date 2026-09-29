import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'

import { createTemporaryDirectory } from '../helpers/create-temporary-directory'
import { ensureGitIgnoreEntries } from '../../config/ensure-gitignore-entries'

describe('ensureGitIgnoreEntries', () => {
  it('creates a local .gitignore file when it is missing', async () => {
    let temporaryDirectory = await createTemporaryDirectory()

    await ensureGitIgnoreEntries(temporaryDirectory, ['.pinbook/', '.env'])

    await expect(
      readFile(join(temporaryDirectory, '.gitignore'), 'utf8'),
    ).resolves.toBe(['.pinbook/', '.env', ''].join('\n'))
  })

  it('appends only missing entries to an existing .gitignore file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()

    await writeFile(
      join(temporaryDirectory, '.gitignore'),
      ['node_modules/', '.env', ''].join('\n'),
      'utf8',
    )

    await ensureGitIgnoreEntries(temporaryDirectory, ['.pinbook/', '.env'])

    await expect(
      readFile(join(temporaryDirectory, '.gitignore'), 'utf8'),
    ).resolves.toBe(['node_modules/', '.env', '.pinbook/', ''].join('\n'))
  })

  it('does not duplicate existing entries', async () => {
    let temporaryDirectory = await createTemporaryDirectory()

    await writeFile(
      join(temporaryDirectory, '.gitignore'),
      ['.pinbook/', '.env', ''].join('\n'),
      'utf8',
    )

    await ensureGitIgnoreEntries(temporaryDirectory, ['.pinbook/', '.env'])

    await expect(
      readFile(join(temporaryDirectory, '.gitignore'), 'utf8'),
    ).resolves.toBe(['.pinbook/', '.env', ''].join('\n'))
  })

  it('rethrows unexpected .gitignore read errors', async () => {
    let temporaryDirectory = await createTemporaryDirectory()

    await mkdir(join(temporaryDirectory, '.gitignore'))

    await expect(
      ensureGitIgnoreEntries(temporaryDirectory, ['.pinbook/']),
    ).rejects.toBeInstanceOf(Error)
  })
})
