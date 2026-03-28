import { writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'

import type { loadConfig as LoadConfig } from '../../config/load-config'

let temporaryDirectories: string[] = []

async function createTemporaryProject(
  files: Record<string, string>,
): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-config-'))
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

async function createTemporaryConfig(content: string): Promise<string> {
  let temporaryDirectory = await mkdtemp(join(tmpdir(), 'pinbook-config-'))
  let filePath = join(temporaryDirectory, 'index.yaml')

  temporaryDirectories.push(temporaryDirectory)

  await writeFile(filePath, content, 'utf8')

  return filePath
}

async function importLoadConfig(): Promise<typeof LoadConfig> {
  let module = await import('../../config/load-config')

  return module.loadConfig
}

function createNonError(): Error {
  return 'broken parser' as unknown as Error
}

function createYaml(lines: string[]): string {
  return lines.join('\n')
}

describe('loadConfig', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, { recursive: true, force: true }),
      ),
    )

    temporaryDirectories = []
    vi.clearAllMocks()
    vi.doUnmock('../../config/parse-yaml')
    vi.doUnmock('../../config/expand-imports')
    vi.resetModules()
  })

  it('loads and validates a valid YAML config file', async () => {
    let filePath = await createTemporaryConfig(
      createYaml([
        'map:',
        '  title: Kyoto 2026',
        'pins:',
        '  - coords: [35.0116, 135.7681]',
        '    id: kyoto-station',
        '    title: Kyoto Station',
      ]),
    )

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).resolves.toEqual({
      pins: [
        {
          coords: [35.0116, 135.7681],
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
        },
      ],
      map: {
        title: 'Kyoto 2026',
      },
      layers: [],
    })
  })

  it('throws ConfigSyntaxError for invalid YAML syntax', async () => {
    let filePath = await createTemporaryConfig(
      createYaml([
        'map:',
        '  title: Kyoto 2026',
        'pins:',
        '  - coords: [35.0116, 135.7681',
      ]),
    )

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).rejects.toMatchObject({
      name: 'ConfigSyntaxError',
    })
  })

  it('falls back to Invalid YAML when parser throws a non-Error value', async () => {
    let filePath = await createTemporaryConfig(
      createYaml([
        'map:',
        '  title: Kyoto 2026',
        'pins:',
        '  - coords: [35.0116, 135.7681]',
        '    id: kyoto-station',
        '    title: Kyoto Station',
      ]),
    )

    vi.resetModules()
    vi.doMock('../../config/parse-yaml', () => ({
      parseYaml() {
        throw createNonError()
      },
    }))

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).rejects.toMatchObject({
      name: 'ConfigSyntaxError',
      message: 'Invalid YAML',
    })
  })

  it('throws ConfigValidationError with formatted issues for invalid config data', async () => {
    let filePath = await createTemporaryConfig(
      createYaml([
        'map:',
        '  title: Kyoto 2026',
        'pins:',
        '  - id: kyoto-station',
        '    title: Kyoto Station',
      ]),
    )

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).rejects.toMatchObject({
      issues: ['pins.0.coords: Pin must include either coords or address'],
      message: 'Config validation failed',
      name: 'ConfigValidationError',
    })
  })

  it('loads and merges imported pin files from root imports', async () => {
    let filePath = await createTemporaryProject({
      'index.yaml': createYaml([
        'map:',
        '  title: Japan Trip',
        'layers:',
        '  - id: food',
        '    title: Food',
        '  - id: sights',
        '    title: Sights',
        'imports:',
        '  - ./cities/*.yaml',
      ]),
      'cities/tokyo-food.yaml': createYaml([
        'pins:',
        '  - address: Onibus Coffee Nakameguro, Tokyo',
        '    id: onibus-coffee-nakameguro',
        '    layer: food',
        '    title: Onibus Coffee Nakameguro',
      ]),
      'cities/kyoto.yaml': createYaml([
        'pins:',
        '  - address: Kyoto Station, Kyoto',
        '    id: kyoto-station',
        '    layer: sights',
        '    title: Kyoto Station',
      ]),
    })

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).resolves.toEqual({
      pins: [
        {
          address: 'Kyoto Station, Kyoto',
          title: 'Kyoto Station',
          id: 'kyoto-station',
          icon: 'shapes-pin',
          color: 'red-500',
          layer: 'sights',
        },
        {
          address: 'Onibus Coffee Nakameguro, Tokyo',
          title: 'Onibus Coffee Nakameguro',
          id: 'onibus-coffee-nakameguro',
          icon: 'shapes-pin',
          color: 'red-500',
          layer: 'food',
        },
      ],
      layers: [
        {
          title: 'Food',
          id: 'food',
        },
        {
          title: 'Sights',
          id: 'sights',
        },
      ],
      map: {
        title: 'Japan Trip',
      },
    })
  })

  it('keeps root pins before imported pins', async () => {
    let filePath = await createTemporaryProject({
      'index.yaml': createYaml([
        'map:',
        '  title: Japan Trip',
        'imports:',
        '  - ./cities/tokyo.yaml',
        'pins:',
        '  - address: Narita International Airport, Japan',
        '    id: narita-airport',
        '    title: Narita Airport',
      ]),
      'cities/tokyo.yaml': createYaml([
        'pins:',
        '  - address: Tokyo Station, Tokyo',
        '    id: tokyo-station',
        '    title: Tokyo Station',
      ]),
    })

    let loadConfig = await importLoadConfig()
    let config = await loadConfig(filePath)

    expect(config.pins.map(pin => pin.id)).toEqual([
      'narita-airport',
      'tokyo-station',
    ])
  })

  it('throws ConfigSyntaxError for invalid imported YAML syntax with file context', async () => {
    let filePath = await createTemporaryProject({
      'cities/tokyo.yaml': createYaml([
        'pins:',
        '  - address: Tokyo Station, Tokyo',
        '    id: tokyo-station',
        '    title: Tokyo Station',
        '    coords: [35.6812, 139.7671',
      ]),
      'index.yaml': createYaml([
        'map:',
        '  title: Japan Trip',
        'imports:',
        '  - ./cities/tokyo.yaml',
      ]),
    })

    let loadConfig = await importLoadConfig()

    let thrownError: unknown

    try {
      await loadConfig(filePath)
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toBeInstanceOf(Error)
    assert.ok(thrownError instanceof Error)
    expect(thrownError.name).toBe('ConfigSyntaxError')
    expect(thrownError.message).toContain('cities/tokyo.yaml:')
  })

  it('throws ConfigValidationError for invalid imported file shape with file context', async () => {
    let filePath = await createTemporaryProject({
      'cities/tokyo.yaml': createYaml([
        'map:',
        '  title: Tokyo',
        'pins:',
        '  - address: Tokyo Station, Tokyo',
        '    id: tokyo-station',
        '    title: Tokyo Station',
      ]),
      'index.yaml': createYaml([
        'map:',
        '  title: Japan Trip',
        'imports:',
        '  - ./cities/tokyo.yaml',
      ]),
    })

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).rejects.toMatchObject({
      issues: ['cities/tokyo.yaml: root: Unrecognized key: "map"'],
      name: 'ConfigValidationError',
    })
  })

  it('throws ConfigValidationError when an import path does not match any files', async () => {
    let filePath = await createTemporaryProject({
      'index.yaml': createYaml([
        'map:',
        '  title: Japan Trip',
        'imports:',
        '  - ./cities/*.yaml',
      ]),
    })

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).rejects.toMatchObject({
      issues: [
        'imports.0: Import did not match any YAML files: ./cities/*.yaml',
      ],
      name: 'ConfigValidationError',
    })
  })

  it('maps merged pin validation issues back to the imported source file', async () => {
    let filePath = await createTemporaryProject({
      'cities/kyoto.yaml': createYaml([
        'pins:',
        '  - address: Kyoto Station, Kyoto',
        '    id: duplicate-pin',
        '    title: Kyoto Station',
      ]),
      'cities/tokyo.yaml': createYaml([
        'pins:',
        '  - address: Tokyo Station, Tokyo',
        '    id: duplicate-pin',
        '    title: Tokyo Station',
      ]),
      'index.yaml': createYaml([
        'map:',
        '  title: Japan Trip',
        'imports:',
        '  - ./cities/*.yaml',
      ]),
    })

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).rejects.toMatchObject({
      issues: [
        'cities/tokyo.yaml: pins.0.id: Pin id must be unique: duplicate-pin',
      ],
      name: 'ConfigValidationError',
    })
  })

  it('throws ConfigValidationError when the composed map has no pins after imports are expanded', async () => {
    let filePath = await createTemporaryConfig(
      createYaml(['map:', '  title: Japan Trip', 'pins: []']),
    )

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).rejects.toMatchObject({
      issues: ['pins: Too small: expected array to have >=1 items'],
      name: 'ConfigValidationError',
    })
  })

  it('keeps root-file validation issue formatting for root pins during final validation', async () => {
    let filePath = await createTemporaryConfig(
      createYaml([
        'map:',
        '  title: Japan Trip',
        'layers:',
        '  - id: food',
        '    title: Food',
        'pins:',
        '  - address: Narita International Airport, Japan',
        '    id: narita-airport',
        '    layer: transit',
        '    title: Narita Airport',
      ]),
    )

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).rejects.toMatchObject({
      issues: ['pins.0.layer: Unknown layer id: transit'],
      name: 'ConfigValidationError',
    })
  })

  it('rethrows unexpected import expansion errors', async () => {
    let filePath = await createTemporaryConfig(
      createYaml([
        'map:',
        '  title: Japan Trip',
        'imports:',
        '  - ./cities/tokyo.yaml',
      ]),
    )

    vi.resetModules()
    vi.doMock('../../config/expand-imports', () => ({
      ImportsResolutionError: class MockImportsResolutionError extends Error {},
      expandImports: vi.fn().mockRejectedValue(new Error('boom')),
    }))

    let loadConfig = await importLoadConfig()

    await expect(loadConfig(filePath)).rejects.toThrow('boom')
  })
})
