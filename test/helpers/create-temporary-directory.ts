import { mkdtemp, rm } from 'node:fs/promises'
import { onTestFinished } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Creates a temporary directory that is removed when the current test finishes.
 *
 * @returns Absolute path to the new temporary directory.
 */
export async function createTemporaryDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-test-'))

  onTestFinished(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true })
  })

  return temporaryDirectory
}
