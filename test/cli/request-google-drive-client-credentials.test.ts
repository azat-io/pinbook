import { isCancel, password, text, log } from '@clack/prompts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requestGoogleDriveClientCredentials } from '../../cli/request-google-drive-client-credentials'

vi.mock('@clack/prompts', () => ({
  isCancel: vi.fn((value: unknown) => value === Symbol.for('clack-cancel')),
  log: {
    info: vi.fn(),
  },
  password: vi.fn(),
  text: vi.fn(),
}))

describe('requestGoogleDriveClientCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prompts for credentials and returns trimmed values', async () => {
    vi.mocked(text).mockResolvedValueOnce('  client-id  ')
    vi.mocked(password).mockResolvedValueOnce('  client-secret  ')

    await expect(requestGoogleDriveClientCredentials()).resolves.toEqual({
      clientSecret: 'client-secret',
      clientId: 'client-id',
    })

    expect(log.info).toHaveBeenCalledWith(
      'Google Drive uploads need an OAuth desktop client from Google Cloud Console.',
    )
    expect(text).toHaveBeenCalledOnce()
    expect(password).toHaveBeenCalledOnce()
    let [textCall] = vi.mocked(text).mock.calls
    let [textOptions] = textCall!
    let [passwordCall] = vi.mocked(password).mock.calls
    let [passwordOptions] = passwordCall!

    expect(textOptions.message).toBe('Enter your Google Drive OAuth client ID:')
    expect(textOptions.validate?.('')).toBe(
      'Google Drive client ID is required.',
    )
    expect(textOptions.validate?.(undefined)).toBe(
      'Google Drive client ID is required.',
    )
    expect(textOptions.validate?.('client-id')).toBeUndefined()
    expect(passwordOptions.message).toBe(
      'Enter your Google Drive OAuth client secret:',
    )
    expect(passwordOptions.validate?.('')).toBe(
      'Google Drive client secret is required.',
    )
    expect(passwordOptions.validate?.(undefined)).toBe(
      'Google Drive client secret is required.',
    )
    expect(passwordOptions.validate?.('client-secret')).toBeUndefined()
    expect(passwordOptions.mask).toBe('*')
  })

  it('returns null when the client id prompt is canceled', async () => {
    vi.mocked(text).mockResolvedValueOnce(Symbol.for('clack-cancel'))

    await expect(requestGoogleDriveClientCredentials()).resolves.toBeNull()

    expect(isCancel).toHaveBeenCalledWith(Symbol.for('clack-cancel'))
    expect(password).not.toHaveBeenCalled()
  })

  it('returns null when the client secret prompt is canceled', async () => {
    vi.mocked(text).mockResolvedValueOnce('client-id')
    vi.mocked(password).mockResolvedValueOnce(Symbol.for('clack-cancel'))

    await expect(requestGoogleDriveClientCredentials()).resolves.toBeNull()

    expect(isCancel).toHaveBeenCalledWith(Symbol.for('clack-cancel'))
  })
})
