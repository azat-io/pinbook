import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { cancel, log } from '@clack/prompts'

import { requestGoogleDriveRefreshToken } from '../../commands/drive-auth/request-google-drive-refresh-token'
import { requestGoogleDriveClientCredentials } from '../../cli/request-google-drive-client-credentials'
import { saveGoogleDriveConfig } from '../../config/save-google-drive-config'
import { loadGoogleDriveConfig } from '../../config/load-google-drive-config'
import { driveAuth } from '../../commands/drive-auth'

let originalStdinIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')
let originalStdoutIsTTY = Object.getOwnPropertyDescriptor(
  process.stdout,
  'isTTY',
)

vi.mock('@clack/prompts', () => ({
  log: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  cancel: vi.fn(),
}))

vi.mock('../../config/load-google-drive-config', () => ({
  loadGoogleDriveConfig: vi.fn(),
}))

vi.mock('../../config/save-google-drive-config', () => ({
  saveGoogleDriveConfig: vi.fn(),
}))

vi.mock('../../cli/request-google-drive-client-credentials', () => ({
  requestGoogleDriveClientCredentials: vi.fn(),
}))

vi.mock('../../commands/drive-auth/request-google-drive-refresh-token', () => ({
  requestGoogleDriveRefreshToken: vi.fn(),
}))

function restoreInteractiveTerminal(): void {
  if (originalStdinIsTTY) {
    Object.defineProperty(process.stdin, 'isTTY', originalStdinIsTTY)
  } else {
    Reflect.deleteProperty(process.stdin, 'isTTY')
  }

  if (originalStdoutIsTTY) {
    Object.defineProperty(process.stdout, 'isTTY', originalStdoutIsTTY)
  } else {
    Reflect.deleteProperty(process.stdout, 'isTTY')
  }
}

function setInteractiveTerminal(isInteractive: boolean): void {
  Object.defineProperty(process.stdin, 'isTTY', {
    value: isInteractive,
    configurable: true,
  })
  Object.defineProperty(process.stdout, 'isTTY', {
    value: isInteractive,
    configurable: true,
  })
}

describe('driveAuth', () => {
  beforeEach(() => {
    process.exitCode = undefined
    vi.clearAllMocks()
    setInteractiveTerminal(true)
  })

  afterEach(() => {
    restoreInteractiveTerminal()
  })

  it('requires an interactive terminal', async () => {
    setInteractiveTerminal(false)

    await driveAuth('example')

    expect(log.error).toHaveBeenCalledWith(
      '`pinbook drive-auth` requires an interactive local terminal.',
    )
    expect(process.exitCode).toBe(1)
  })

  it('cancels when credential prompts are canceled', async () => {
    vi.mocked(loadGoogleDriveConfig).mockResolvedValueOnce({})
    vi.mocked(requestGoogleDriveClientCredentials).mockResolvedValueOnce(null)

    await driveAuth('example')

    expect(cancel).toHaveBeenCalledWith('Drive auth canceled.')
    expect(saveGoogleDriveConfig).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('uses saved OAuth client credentials and preserves the folder id', async () => {
    vi.mocked(loadGoogleDriveConfig).mockResolvedValueOnce({
      clientSecret: 'client-secret',
      clientId: 'client-id',
      folderId: 'folder-id',
    })
    vi.mocked(requestGoogleDriveRefreshToken).mockResolvedValueOnce(
      'refresh-token',
    )

    await expect(driveAuth('example')).resolves.toBeUndefined()

    expect(requestGoogleDriveClientCredentials).not.toHaveBeenCalled()
    expect(requestGoogleDriveRefreshToken).toHaveBeenCalledWith({
      clientSecret: 'client-secret',
      clientId: 'client-id',
    })
    expect(saveGoogleDriveConfig).toHaveBeenCalledWith('example/index.yaml', {
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      clientId: 'client-id',
      folderId: 'folder-id',
    })
    expect(log.success).toHaveBeenCalledWith(
      'Google Drive auth saved to the local .env file.',
    )
  })

  it('prompts for missing OAuth client credentials before saving them', async () => {
    vi.mocked(loadGoogleDriveConfig).mockResolvedValueOnce({})
    vi.mocked(requestGoogleDriveClientCredentials).mockResolvedValueOnce({
      clientSecret: 'prompted-client-secret',
      clientId: 'prompted-client-id',
    })
    vi.mocked(requestGoogleDriveRefreshToken).mockResolvedValueOnce(
      'refresh-token',
    )

    await expect(driveAuth('example')).resolves.toBeUndefined()

    expect(requestGoogleDriveClientCredentials).toHaveBeenCalledWith()
    expect(requestGoogleDriveRefreshToken).toHaveBeenCalledWith({
      clientSecret: 'prompted-client-secret',
      clientId: 'prompted-client-id',
    })
    expect(saveGoogleDriveConfig).toHaveBeenCalledWith('example/index.yaml', {
      clientSecret: 'prompted-client-secret',
      clientId: 'prompted-client-id',
      refreshToken: 'refresh-token',
    })
  })
})
