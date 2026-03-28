import { writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { vi } from 'vitest'

import type { expandImports as ExpandImports } from '../../config/expand-imports'

import { expandImports } from '../../config/expand-imports'

let temporaryDirectories: string[] = []

async function createTemporaryProject(
  files: Record<string, string>,
): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-imports-'))
  let rootFilePath = join(temporaryDirectory, 'index.yaml')

  temporaryDirectories.push(temporaryDirectory)

  await Promise.all(
    Object.entries(files).map(async ([relativeFilePath, content]) => {
      let filePath = join(temporaryDirectory, relativeFilePath)

      await mkdir(dirname(filePath), {
        recursive: true,
      })
      await writeFile(filePath, content, 'utf8')
    }),
  )

  return rootFilePath
}

async function importExpandImports(): Promise<typeof ExpandImports> {
  let module = await import('../../config/expand-imports')

  return module.expandImports
}

describe('expandImports', () => {
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

  it('resolves an exact relative YAML file import', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
      'cities/tokyo.yaml': 'pins: []\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/tokyo.yaml']),
    ).resolves.toHaveLength(1)
    await expect(
      expandImports(rootFilePath, ['./cities/tokyo.yaml']),
    ).resolves.toContain(join(dirname(rootFilePath), 'cities', 'tokyo.yaml'))
  })

  it('resolves glob imports in lexicographic order', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
      'cities/kyoto.yaml': 'pins: []\n',
      'cities/osaka.yaml': 'pins: []\n',
      'cities/tokyo.yaml': 'pins: []\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/*.yaml']),
    ).resolves.toEqual([
      join(dirname(rootFilePath), 'cities', 'kyoto.yaml'),
      join(dirname(rootFilePath), 'cities', 'osaka.yaml'),
      join(dirname(rootFilePath), 'cities', 'tokyo.yaml'),
    ])
  })

  it('rejects imports that do not match any YAML files', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/*.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          message: 'Import did not match any YAML files: ./cities/*.yaml',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('treats a missing exact YAML file import as an unmatched import', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/tokyo.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          message: 'Import did not match any YAML files: ./cities/tokyo.yaml',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('rejects duplicate imported files across multiple entries', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
      'cities/tokyo.yaml': 'pins: []\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/tokyo.yaml', './cities/*.yaml']),
    ).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          message:
            'Import resolves the same file more than once: cities/tokyo.yaml',
          path: 'imports.1',
        }),
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('rejects importing the root config file itself', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
    })

    await expect(
      expandImports(rootFilePath, ['./index.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          message: 'Import cannot include the root config file: ./index.yaml',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('rejects absolute import paths', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
    })

    await expect(
      expandImports(rootFilePath, ['/tmp/tokyo.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          message: 'Import paths must be relative to the root config file',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('rejects recursive glob imports using double-star', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/**/*.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          message: 'Recursive "**" globs are not supported',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('rejects exact imports that are not YAML files', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
      'cities/tokyo.json': '{}\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/tokyo.json']),
    ).rejects.toMatchObject({
      issues: [
        {
          message:
            'Import must point to a .yaml or .yml file: ./cities/tokyo.json',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('rejects exact imports that resolve to a directory', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
      'cities/tokyo/food.yaml': 'pins: []\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/tokyo']),
    ).rejects.toMatchObject({
      issues: [
        {
          message: 'Import must point to a .yaml or .yml file: ./cities/tokyo',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('rejects exact imports that resolve to a directory with a YAML extension', async () => {
    let rootFilePath = await createTemporaryProject({
      'cities/tokyo.yaml/placeholder.txt': 'placeholder\n',
      'index.yaml': 'map:\n  title: Japan Trip\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/tokyo.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          message: 'Import must point to a file: ./cities/tokyo.yaml',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('resolves wildcard directory segments before the final YAML file match', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
      'cities/tokyo/food.yaml': 'pins: []\n',
      'cities/kyoto/food.yaml': 'pins: []\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/*/food.yaml']),
    ).resolves.toEqual([
      join(dirname(rootFilePath), 'cities', 'kyoto', 'food.yaml'),
      join(dirname(rootFilePath), 'cities', 'tokyo', 'food.yaml'),
    ])
  })

  it('treats exact glob segments with the wrong file type as an unmatched import', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
      'cities/tokyo.yaml': 'pins: []\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/tokyo.yaml/*.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          message:
            'Import did not match any YAML files: ./cities/tokyo.yaml/*.yaml',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('supports question-mark wildcards inside a path segment', async () => {
    let rootFilePath = await createTemporaryProject({
      'index.yaml': 'map:\n  title: Japan Trip\n',
      'cities/tokyo.yaml': 'pins: []\n',
    })

    await expect(
      expandImports(rootFilePath, ['./cities/t?kyo.yaml']),
    ).resolves.toEqual([join(dirname(rootFilePath), 'cities', 'tokyo.yaml')])
  })

  it('falls back to a generic message when import resolution throws a non-Error value', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      stat: vi.fn().mockRejectedValue('boom'),
      readdir: vi.fn(),
    }))

    let isolatedExpandImports = await importExpandImports()

    await expect(
      isolatedExpandImports('/tmp/project/index.yaml', ['./cities/tokyo.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          message: 'Invalid import entry',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('surfaces unexpected readdir errors while expanding wildcard segments', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      stat: vi.fn().mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      }),
      readdir: vi.fn().mockRejectedValue(new Error('boom')),
    }))

    let isolatedExpandImports = await importExpandImports()

    await expect(
      isolatedExpandImports('/index.yaml', ['./*.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          path: 'imports.0',
          message: 'boom',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('treats ENOENT readdir errors as an empty wildcard match', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      readdir: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('missing'), { code: 'ENOENT' }),
        ),
      stat: vi.fn().mockResolvedValue({
        isDirectory: () => true,
        isFile: () => false,
      }),
    }))

    let isolatedExpandImports = await importExpandImports()

    await expect(
      isolatedExpandImports('/index.yaml', ['./*.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          message: 'Import did not match any YAML files: ./*.yaml',
          path: 'imports.0',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })

  it('surfaces unexpected stat errors while walking exact path segments in a glob', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      stat: vi.fn().mockRejectedValue(new Error('boom')),
      readdir: vi.fn(),
    }))

    let isolatedExpandImports = await importExpandImports()

    await expect(
      isolatedExpandImports('/index.yaml', ['./cities/*.yaml']),
    ).rejects.toMatchObject({
      issues: [
        {
          path: 'imports.0',
          message: 'boom',
        },
      ],
      name: 'ImportsResolutionError',
    })
  })
})
