import type { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { log } from '@clack/prompts'

import { exchangeAuthorizationCodeForRefreshToken } from '../../../commands/drive-auth/exchange-authorization-code-for-refresh-token'
import { requestGoogleDriveRefreshToken } from '../../../commands/drive-auth/request-google-drive-refresh-token'
import { waitForAuthorizationCode } from '../../../commands/drive-auth/wait-for-authorization-code'

let { createServerMock, randomBytesMock } = vi.hoisted(() => ({
  randomBytesMock: vi.fn(() => Buffer.from('0123456789abcdef')),
  createServerMock: vi.fn(),
}))

vi.mock('@clack/prompts', () => ({
  log: {
    info: vi.fn(),
  },
}))

vi.mock('node:crypto', () => ({
  randomBytes: randomBytesMock,
}))

vi.mock('node:http', () => ({
  createServer: createServerMock,
}))

vi.mock('../../../commands/drive-auth/wait-for-authorization-code', () => ({
  waitForAuthorizationCode: vi.fn(),
}))

vi.mock(
  '../../../commands/drive-auth/exchange-authorization-code-for-refresh-token',
  () => ({
    exchangeAuthorizationCodeForRefreshToken: vi.fn(),
  }),
)

type MockListener = (...arguments_: unknown[]) => void

class MockServer {
  private readonly listeners = new Map<string, { listener: MockListener }[]>()

  public off = vi.fn((eventName: string, listener: MockListener) => {
    let listeners = this.listeners.get(eventName) ?? []

    this.listeners.set(
      eventName,
      listeners.filter(entry => entry.listener !== listener),
    )

    return this
  })

  public address = vi.fn<() => AddressInfo | string | null>(() => ({
    address: '127.0.0.1',
    family: 'IPv4',
    port: 56125,
  }))

  public listen = vi.fn(
    (_port: number, _host: string, callback: () => void) => {
      callback()

      return this
    },
  )

  public close = vi.fn((callback: () => void) => {
    callback()

    return this
  })

  public emit(eventName: string, ...arguments_: unknown[]): void {
    let listeners = this.listeners.get(eventName) ?? []

    this.listeners.delete(eventName)

    for (let entry of listeners) {
      entry.listener(...arguments_)
    }
  }

  public once(eventName: string, listener: MockListener): this {
    let listeners = this.listeners.get(eventName) ?? []

    listeners.push({
      listener,
    })
    this.listeners.set(eventName, listeners)

    return this
  }
}

describe('requestGoogleDriveRefreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createServerMock.mockReset()
    randomBytesMock.mockReset()
    randomBytesMock.mockReturnValue(Buffer.from('0123456789abcdef'))
  })

  it('opens the browser flow, exchanges the callback code, and closes the server', async () => {
    let server = new MockServer()

    createServerMock.mockReturnValue(
      server as unknown as ReturnType<typeof createServer>,
    )
    vi.mocked(waitForAuthorizationCode).mockResolvedValueOnce(
      'authorization-code',
    )
    vi.mocked(exchangeAuthorizationCodeForRefreshToken).mockResolvedValueOnce(
      'refresh-token',
    )

    await expect(
      requestGoogleDriveRefreshToken({
        clientSecret: 'client-secret',
        clientId: 'client-id',
      }),
    ).resolves.toBe('refresh-token')

    let loggedAuthorizationUrl = vi.mocked(log.info).mock.calls[1]?.[0]

    expect(loggedAuthorizationUrl).toBeTypeOf('string')

    let authorizationUrl = new URL(loggedAuthorizationUrl!)
    let expectedState = Buffer.from('0123456789abcdef').toString('hex')

    expect(vi.mocked(log.info).mock.calls[0]?.[0]).toBe(
      'Open this URL in a browser and finish the Google sign-in flow:',
    )
    expect(authorizationUrl.searchParams.get('access_type')).toBe('offline')
    expect(authorizationUrl.searchParams.get('client_id')).toBe('client-id')
    expect(authorizationUrl.searchParams.get('include_granted_scopes')).toBe(
      'true',
    )
    expect(authorizationUrl.searchParams.get('prompt')).toBe('consent')
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(
      'http://127.0.0.1:56125/oauth2/callback',
    )
    expect(authorizationUrl.searchParams.get('response_type')).toBe('code')
    expect(authorizationUrl.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/drive.file',
    )
    expect(authorizationUrl.searchParams.get('state')).toBe(expectedState)
    expect(waitForAuthorizationCode).toHaveBeenCalledWith(server, expectedState)
    expect(exchangeAuthorizationCodeForRefreshToken).toHaveBeenCalledWith({
      redirectUri: 'http://127.0.0.1:56125/oauth2/callback',
      authorizationCode: 'authorization-code',
      clientSecret: 'client-secret',
      clientId: 'client-id',
    })
    expect(vi.mocked(log.info).mock.calls[2]?.[0]).toBe(
      'Google authorization code received. Exchanging it for a refresh token...',
    )
    expect(server.close).toHaveBeenCalledOnce()
  })

  it('throws when the local callback port cannot be determined from a null address', async () => {
    let server = new MockServer()

    server.address.mockReturnValueOnce(null)
    createServerMock.mockReturnValue(
      server as unknown as ReturnType<typeof createServer>,
    )

    await expect(
      requestGoogleDriveRefreshToken({
        clientSecret: 'client-secret',
        clientId: 'client-id',
      }),
    ).rejects.toThrow('Could not determine local OAuth callback port.')

    expect(server.close).toHaveBeenCalledOnce()
  })

  it('throws when the local callback port cannot be determined from a string address', async () => {
    let server = new MockServer()

    server.address.mockReturnValueOnce('127.0.0.1:56125')
    createServerMock.mockReturnValue(
      server as unknown as ReturnType<typeof createServer>,
    )

    await expect(
      requestGoogleDriveRefreshToken({
        clientSecret: 'client-secret',
        clientId: 'client-id',
      }),
    ).rejects.toThrow('Could not determine local OAuth callback port.')

    expect(server.close).toHaveBeenCalledOnce()
  })

  it('closes the server when the token exchange fails', async () => {
    let server = new MockServer()

    createServerMock.mockReturnValue(
      server as unknown as ReturnType<typeof createServer>,
    )
    vi.mocked(waitForAuthorizationCode).mockResolvedValueOnce(
      'authorization-code',
    )
    vi.mocked(exchangeAuthorizationCodeForRefreshToken).mockRejectedValueOnce(
      new Error('exchange failed'),
    )

    await expect(
      requestGoogleDriveRefreshToken({
        clientSecret: 'client-secret',
        clientId: 'client-id',
      }),
    ).rejects.toThrow('exchange failed')

    expect(server.close).toHaveBeenCalledOnce()
  })
})
