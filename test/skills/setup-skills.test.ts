import { writeFile, readFile, mkdtemp, access, rm } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'

import { setupSkills } from '../../skills/setup-skills'

let temporaryDirectories: string[] = []

/**
 * Creates a temporary Pinbook project directory for skill setup tests.
 *
 * @returns Absolute path to the temporary directory.
 */
async function createTemporaryDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-skills-'))

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('setupSkills', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
    vi.clearAllMocks()
    vi.doUnmock('node:fs/promises')
    vi.resetModules()
  })

  it('copies the Pinbook skill and references into the target project', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let sourceSkillsDirectoryPath = resolve(
      import.meta.dirname,
      '..',
      '..',
      'skills',
    )

    await setupSkills(temporaryDirectory)

    await expect(
      access(
        join(temporaryDirectory, 'skills', 'pinbook', 'references', 'icons'),
      ),
    ).resolves.toBeUndefined()
    await expect(
      readFile(
        join(temporaryDirectory, 'skills', 'pinbook', 'SKILL.md'),
        'utf8',
      ),
    ).resolves.toBe(
      await readFile(join(sourceSkillsDirectoryPath, 'index.md'), 'utf8'),
    )
    await expect(
      readFile(
        join(
          temporaryDirectory,
          'skills',
          'pinbook',
          'references',
          'colors.md',
        ),
        'utf8',
      ),
    ).resolves.toBe(
      await readFile(
        join(sourceSkillsDirectoryPath, 'references', 'colors.md'),
        'utf8',
      ),
    )
    await expect(
      readFile(join(temporaryDirectory, 'AGENTS.md'), 'utf8'),
    ).resolves.toContain('./skills/pinbook/SKILL.md')
  })

  it('appends the Pinbook block when AGENTS.md exists without one', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let agentsFilePath = join(temporaryDirectory, 'AGENTS.md')

    await writeFile(
      agentsFilePath,
      ['# Project Instructions', '', 'Keep responses concise.', ''].join('\n'),
      'utf8',
    )

    await setupSkills(temporaryDirectory)

    await expect(readFile(agentsFilePath, 'utf8')).resolves.toBe(
      [
        '# Project Instructions',
        '',
        'Keep responses concise.',
        '',
        '<!-- pinbook:start -->',
        'Use `./skills/pinbook/SKILL.md` when creating, editing, or reviewing `index.yaml` in this Pinbook project.',
        'Use `./skills/pinbook/references/colors.md` for valid `pin.color` values.',
        'Use `./skills/pinbook/references/icons/index.md` for valid `pin.icon` ids.',
        '<!-- pinbook:end -->',
        '',
      ].join('\n'),
    )
  })

  it('updates only the managed Pinbook block inside an existing AGENTS.md file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let agentsFilePath = join(temporaryDirectory, 'AGENTS.md')

    await writeFile(
      agentsFilePath,
      [
        '# Project Instructions',
        '',
        'Keep responses concise.',
        '',
        '<!-- pinbook:start -->',
        'Old Pinbook instructions.',
        '<!-- pinbook:end -->',
        '',
        'Do not remove this line.',
        '',
      ].join('\n'),
      'utf8',
    )

    await setupSkills(temporaryDirectory)

    await expect(readFile(agentsFilePath, 'utf8')).resolves.toBe(
      [
        '# Project Instructions',
        '',
        'Keep responses concise.',
        '',
        '<!-- pinbook:start -->',
        'Use `./skills/pinbook/SKILL.md` when creating, editing, or reviewing `index.yaml` in this Pinbook project.',
        'Use `./skills/pinbook/references/colors.md` for valid `pin.color` values.',
        'Use `./skills/pinbook/references/icons/index.md` for valid `pin.icon` ids.',
        '<!-- pinbook:end -->',
        '',
        'Do not remove this line.',
        '',
      ].join('\n'),
    )
  })

  it('throws when the source Pinbook skill files cannot be found', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      access: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('missing'), { code: 'ENOENT' }),
        ),
      writeFile: vi.fn(),
      readFile: vi.fn(),
      mkdir: vi.fn(),
      cp: vi.fn(),
    }))

    let { setupSkills: isolatedSetupSkills } =
      await import('../../skills/setup-skills')

    await expect(isolatedSetupSkills('/tmp/project')).rejects.toThrow(
      'Pinbook skill sources could not be found.',
    )
  })

  it('rethrows unexpected access errors while resolving source skill files', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      access: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('boom'), { code: 'EACCES' }),
        ),
      writeFile: vi.fn(),
      readFile: vi.fn(),
      mkdir: vi.fn(),
      cp: vi.fn(),
    }))

    let { setupSkills: isolatedSetupSkills } =
      await import('../../skills/setup-skills')

    await expect(isolatedSetupSkills('/tmp/project')).rejects.toThrow('boom')
  })

  it('rethrows unexpected read errors while updating AGENTS.md', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      readFile: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('boom'), { code: 'EACCES' }),
        ),
      access: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      cp: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn(),
    }))

    let { setupSkills: isolatedSetupSkills } =
      await import('../../skills/setup-skills')

    await expect(isolatedSetupSkills('/tmp/project')).rejects.toThrow('boom')
  })
})
