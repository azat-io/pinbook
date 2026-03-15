import {
  writeFile,
  readFile,
  mkdtemp,
  access,
  mkdir,
  rm,
} from 'node:fs/promises'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { cancel, log } from '@clack/prompts'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { requestProjectDirectory } from '../../cli/request-project-directory'
import { create } from '../../commands/create'
import { version } from '../../package.json'

vi.mock('@clack/prompts', () => ({
  log: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  cancel: vi.fn(),
}))

vi.mock('../../cli/request-project-directory', () => ({
  requestProjectDirectory: vi.fn(),
}))

let temporaryDirectories: string[] = []

async function createTemporaryDirectory(): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-create-'))

  temporaryDirectories.push(temporaryDirectory)

  return temporaryDirectory
}

describe('create', () => {
  beforeEach(() => {
    process.exitCode = undefined
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
    vi.doUnmock('node:fs/promises')
    vi.doUnmock('../../config/ensure-gitignore-entries')
    vi.doUnmock('../../cli/request-project-directory')
    vi.resetModules()
  })

  it('creates a project scaffold for an explicit directory', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let projectDirectoryPath = join(temporaryDirectory, 'tokyo-first-week')

    await create(projectDirectoryPath)

    await expect(
      access(join(projectDirectoryPath, 'photos')),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(
      access(join(projectDirectoryPath, 'skills', 'pinbook', 'references')),
    ).resolves.toBeUndefined()
    await expect(
      readFile(join(projectDirectoryPath, '.gitignore'), 'utf8'),
    ).resolves.toBe(['.pinbook/', '.env', ''].join('\n'))
    await expect(
      readFile(join(projectDirectoryPath, 'index.yaml'), 'utf8'),
    ).resolves.toContain('title: "Tokyo First Week"')
    await expect(
      readFile(join(projectDirectoryPath, 'index.yaml'), 'utf8'),
    ).resolves.toContain(
      '#   photo: https://example.com/photos/tokyo-tower.jpg',
    )
    await expect(
      readFile(join(projectDirectoryPath, 'package.json'), 'utf8'),
    ).resolves.toBe(
      `${JSON.stringify(
        /* eslint-disable perfectionist/sort-objects */
        {
          name: 'tokyo-first-week',
          private: true,
          scripts: {
            build: 'pinbook build',
          },
          dependencies: {
            pinbook: version,
          },
        },
        /* eslint-enable perfectionist/sort-objects */
        null,
        2,
      )}\n`,
    )
    await expect(
      readFile(join(projectDirectoryPath, 'AGENTS.md'), 'utf8'),
    ).resolves.toContain('./skills/pinbook/SKILL.md')
    expect(requestProjectDirectory).not.toHaveBeenCalled()
    expect(log.success).toHaveBeenCalledWith(
      `Created Pinbook map project at ${projectDirectoryPath}.`,
    )
    expect(log.info).toHaveBeenCalledWith(
      `Edit ${join(projectDirectoryPath, 'index.yaml')} and add at least one pin in YAML.`,
    )
    expect(log.info).toHaveBeenCalledWith(
      `AI skill: ${join(projectDirectoryPath, 'skills', 'pinbook', 'SKILL.md')}`,
    )
    expect(log.info).toHaveBeenCalledWith('Run: pnpm install')
    expect(log.info).toHaveBeenCalledWith('Run: pnpm build')
    expect(log.info).toHaveBeenCalledWith(
      'Import: .pinbook/map.kml into Google My Maps',
    )
  })

  it('prompts for a directory when no path is provided', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let projectDirectoryPath = join(temporaryDirectory, 'weekend-map')

    vi.mocked(requestProjectDirectory).mockResolvedValueOnce(
      projectDirectoryPath,
    )

    await create()

    await expect(
      readFile(join(projectDirectoryPath, 'index.yaml'), 'utf8'),
    ).resolves.toContain('title: "Weekend Map"')
    await expect(
      readFile(join(projectDirectoryPath, 'package.json'), 'utf8'),
    ).resolves.toContain('"name": "weekend-map"')
    expect(requestProjectDirectory).toHaveBeenCalledOnce()
  })

  it('cancels project creation when the directory prompt is canceled', async () => {
    vi.mocked(requestProjectDirectory).mockResolvedValueOnce(null)

    await create()

    expect(cancel).toHaveBeenCalledWith('Create canceled.')
    expect(process.exitCode).toBe(1)
  })

  it('does not overwrite an existing project config file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let projectDirectoryPath = join(temporaryDirectory, 'existing-project')
    let configFilePath = join(projectDirectoryPath, 'index.yaml')

    await mkdir(projectDirectoryPath, {
      recursive: true,
    })
    await writeFile(
      configFilePath,
      'map:\n  title: Existing\npins: []\n',
      'utf8',
    )

    await create(projectDirectoryPath)

    await expect(readFile(configFilePath, 'utf8')).resolves.toBe(
      'map:\n  title: Existing\npins: []\n',
    )
    expect(log.error).toHaveBeenCalledWith(
      `Project already exists: ${configFilePath}`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('does not overwrite an existing package.json file', async () => {
    let temporaryDirectory = await createTemporaryDirectory()
    let projectDirectoryPath = join(temporaryDirectory, 'existing-package')
    let packageJsonFilePath = join(projectDirectoryPath, 'package.json')

    await mkdir(projectDirectoryPath, {
      recursive: true,
    })
    await writeFile(packageJsonFilePath, '{ "name": "existing" }\n', 'utf8')

    await create(projectDirectoryPath)

    await expect(readFile(packageJsonFilePath, 'utf8')).resolves.toBe(
      '{ "name": "existing" }\n',
    )
    expect(log.error).toHaveBeenCalledWith(
      `Project already exists: ${packageJsonFilePath}`,
    )
    expect(process.exitCode).toBe(1)
  })

  it('falls back to an untitled map title when the directory name is empty', async () => {
    let mockedAccess = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('missing'), { code: 'ENOENT' }),
      )
    let mockedReadFile = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('missing'), { code: 'ENOENT' }),
      )
    let mockedMkdir = vi.fn().mockResolvedValue(undefined)
    let mockedWriteFile = vi.fn().mockResolvedValue(undefined)
    let mockedEnsureGitIgnoreEntries = vi.fn().mockResolvedValue(undefined)

    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      writeFile: mockedWriteFile,
      readFile: mockedReadFile,
      access: mockedAccess,
      mkdir: mockedMkdir,
    }))
    vi.doMock('../../config/ensure-gitignore-entries', () => ({
      ensureGitIgnoreEntries: mockedEnsureGitIgnoreEntries,
    }))
    vi.doMock('../../skills/setup-skills', () => ({
      setupSkills: vi.fn().mockResolvedValue(undefined),
    }))

    let { create: isolatedCreate } = await import('../../commands/create')

    await isolatedCreate('/')

    expect(mockedWriteFile).toHaveBeenCalledWith(
      '/index.yaml',
      expect.stringContaining('title: "Untitled Map"'),
      'utf8',
    )
    expect(mockedWriteFile).toHaveBeenCalledWith(
      '/package.json',
      expect.stringContaining('"name": "pinbook-map"'),
      'utf8',
    )
  })

  it('rethrows unexpected file access errors while checking for an existing project', async () => {
    let mockedAccess = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('boom'), { code: 'EACCES' }))
    let mockedReadFile = vi.fn()
    let mockedMkdir = vi.fn().mockResolvedValue(undefined)
    let mockedWriteFile = vi.fn().mockResolvedValue(undefined)
    let temporaryDirectory = await createTemporaryDirectory()
    let projectDirectoryPath = join(temporaryDirectory, 'permission-denied')

    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      writeFile: mockedWriteFile,
      readFile: mockedReadFile,
      access: mockedAccess,
      mkdir: mockedMkdir,
    }))
    vi.doMock('../../config/ensure-gitignore-entries', () => ({
      ensureGitIgnoreEntries: vi.fn().mockResolvedValue(undefined),
    }))
    vi.doMock('../../skills/setup-skills', () => ({
      setupSkills: vi.fn().mockResolvedValue(undefined),
    }))

    let { create: isolatedCreate } = await import('../../commands/create')

    await expect(isolatedCreate(projectDirectoryPath)).rejects.toThrow('boom')
  })
})
