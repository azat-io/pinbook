import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isCancel, password, log } from '@clack/prompts'

import { requestGoogleMapsApiKey } from '../../cli/request-google-maps-api-key'

vi.mock('@clack/prompts', () => ({
  isCancel: vi.fn((value: unknown) => value === Symbol.for('clack-cancel')),
  log: {
    info: vi.fn(),
  },
  password: vi.fn(),
}))

describe('requestGoogleMapsApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prompts for a missing Google Maps API key', async () => {
    vi.mocked(password).mockResolvedValueOnce('  test-key  ')

    await expect(requestGoogleMapsApiKey('missing')).resolves.toBe('test-key')

    expect(log.info).toHaveBeenCalledWith(
      'Google Maps API key is required to geocode uncached addresses.',
    )
    expect(password).toHaveBeenCalledOnce()
    let [passwordCall] = vi.mocked(password).mock.calls
    let [passwordOptions] = passwordCall!

    expect(passwordOptions.message).toBe(
      'Enter your Google Maps API key to geocode uncached addresses:',
    )
    expect(passwordOptions.mask).toBe('*')
    expect(passwordOptions.validate?.('')).toBe(
      'Google Maps API key is required.',
    )
    expect(passwordOptions.validate?.('test-key')).toBeUndefined()
  })

  it('prompts for a replacement Google Maps API key after an invalid key error', async () => {
    vi.mocked(password).mockResolvedValueOnce('replacement-key')

    await expect(requestGoogleMapsApiKey('invalid')).resolves.toBe(
      'replacement-key',
    )

    expect(log.info).toHaveBeenCalledWith(
      'Saved Google Maps API key was rejected. Enter a replacement key to retry.',
    )
    let [passwordCall] = vi.mocked(password).mock.calls
    let [passwordOptions] = passwordCall!

    expect(passwordOptions.message).toBe(
      'Enter a replacement Google Maps API key:',
    )
  })

  it('returns null when the Google Maps API key prompt is canceled', async () => {
    vi.mocked(password).mockResolvedValueOnce(Symbol.for('clack-cancel'))

    await expect(requestGoogleMapsApiKey('missing')).resolves.toBeNull()

    expect(isCancel).toHaveBeenCalledWith(Symbol.for('clack-cancel'))
  })
})
