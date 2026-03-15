import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { log } from '@clack/prompts'

import { getCommandUsage, helpMessage } from '../../cli/help'
import { parseFlags } from '../../cli/parse-flags'
import { create } from '../../commands/create'
import { build } from '../../commands/build'
import { version } from '../../package.json'
import { run } from '../../cli/index'

vi.mock('@clack/prompts', () => ({
  log: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('../../cli/parse-flags', () => ({
  parseFlags: vi.fn(),
}))

vi.mock('../../commands/build', () => ({
  build: vi.fn(),
}))

vi.mock('../../commands/create', () => ({
  create: vi.fn(),
}))

class ProcessExitError extends Error {
  public code: undefined | number | string | null

  public constructor(code: undefined | number | string | null) {
    super('ProcessExit')
    this.name = 'ProcessExitError'
    this.code = code
  }
}

describe('run', () => {
  beforeEach(() => {
    process.exitCode = undefined
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs the version and exits with code 0', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({
      version: true,
    })

    vi.spyOn(process, 'exit').mockImplementation(code => {
      throw new ProcessExitError(code)
    })

    await expect(run()).rejects.toMatchObject({
      message: 'ProcessExit',
      code: 0,
    })

    expect(parseFlags).toHaveBeenCalledWith(process.argv)
    expect(log.info).toHaveBeenCalledWith(version)
  })

  it('prints help when no command is provided', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({})

    await run()

    expect(build).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(log.info).toHaveBeenCalledWith(helpMessage)
    expect(log.error).not.toHaveBeenCalledWith('Unknown command')
    expect(process.exitCode).toBeUndefined()
  })

  it('prints help when the help flag is provided without a command', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({
      help: true,
    })

    await run()

    expect(build).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(log.info).toHaveBeenCalledWith(helpMessage)
    expect(log.error).not.toHaveBeenCalledWith('Unknown command')
    expect(process.exitCode).toBeUndefined()
  })

  it('runs build without a target path', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({
      command: 'build',
    })

    vi.mocked(build).mockResolvedValueOnce()

    await run()

    expect(build).toHaveBeenCalledWith(undefined)
    expect(log.error).not.toHaveBeenCalledWith(getCommandUsage('build'))
    expect(process.exitCode).toBeUndefined()
  })

  it('prints build help when the help flag is provided', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({
      command: 'build',
      help: true,
    })

    await run()

    expect(build).not.toHaveBeenCalled()
    expect(log.info).toHaveBeenCalledWith(getCommandUsage('build'))
    expect(process.exitCode).toBeUndefined()
  })

  it('runs build for a config file', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({
      targetPath: 'index.yaml',
      command: 'build',
    })

    vi.mocked(build).mockResolvedValueOnce()

    await run()

    expect(build).toHaveBeenCalledWith('index.yaml')
    expect(log.error).not.toHaveBeenCalledWith('Unknown command')
  })

  it('prints create help when the help flag is provided', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({
      command: 'create',
      help: true,
    })

    await run()

    expect(create).not.toHaveBeenCalled()
    expect(log.info).toHaveBeenCalledWith(getCommandUsage('create'))
    expect(process.exitCode).toBeUndefined()
  })

  it('runs create without a target path', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({
      command: 'create',
    })

    vi.mocked(create).mockResolvedValueOnce()

    await run()

    expect(create).toHaveBeenCalledWith(undefined)
    expect(log.error).not.toHaveBeenCalledWith('Unknown command')
  })

  it('runs create for an explicit directory', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({
      targetPath: 'maps/tokyo',
      command: 'create',
    })

    vi.mocked(create).mockResolvedValueOnce()

    await run()

    expect(create).toHaveBeenCalledWith('maps/tokyo')
    expect(log.error).not.toHaveBeenCalledWith('Unknown command')
  })

  it('prints an error for an unknown command', async () => {
    vi.mocked(parseFlags).mockReturnValueOnce({
      command: 'unknown',
    })

    await run()

    expect(build).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(log.error).toHaveBeenCalledWith('Unknown command')
    expect(log.info).toHaveBeenCalledWith(helpMessage)
    expect(process.exitCode).toBe(1)
  })
})
