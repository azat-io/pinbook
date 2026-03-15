import { afterEach, describe, expect, it, vi } from 'vitest'
import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { loadConfig as LoadConfig } from '../../config/load-config'

let temporaryDirectories: string[] = []

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
})
