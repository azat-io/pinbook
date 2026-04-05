import type { createServer } from 'node:http'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForAuthorizationCode } from '../../../commands/drive-auth/wait-for-authorization-code'

type MockListener = (...arguments_: unknown[]) => void

class MockServer {
  private readonly listeners = new Map<string, { listener: MockListener }[]>()

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

function createMockResponse(): {
  setHeader: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  statusCode: number
} {
  return {
    setHeader: vi.fn(),
    statusCode: 0,
    end: vi.fn(),
  }
}

function createMockServer(): ReturnType<typeof createServer> {
  return new MockServer() as unknown as ReturnType<typeof createServer>
}

describe('waitForAuthorizationCode', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('resolves the callback code and returns the success page', async () => {
    let server = createMockServer()
    let response = createMockResponse()
    let authorizationCodePromise = waitForAuthorizationCode(
      server,
      'expected-state',
    )

    server.emit(
      'request',
      {
        url: '/oauth2/callback?state=expected-state&code=authorization-code',
        headers: {
          host: '127.0.0.1:56125',
        },
      },
      response,
    )

    await expect(authorizationCodePromise).resolves.toBe('authorization-code')

    expect(response.statusCode).toBe(200)
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/html; charset=utf-8',
    )
    expect(response.end).toHaveBeenCalledWith(
      '<!doctype html><title>Pinbook</title><p>Pinbook authorization complete. You can close this tab.</p>',
    )
  })

  it('rejects unexpected callback paths and falls back to the default host and path inputs', async () => {
    let server = createMockServer()
    let response = createMockResponse()
    let authorizationCodePromise = waitForAuthorizationCode(
      server,
      'expected-state',
    )

    server.emit(
      'request',
      {
        url: undefined,
        headers: {},
      },
      response,
    )

    await expect(authorizationCodePromise).rejects.toThrow(
      'Unexpected Google OAuth callback path.',
    )

    expect(response.statusCode).toBe(404)
    expect(response.end).toHaveBeenCalledWith('Not found')
  })

  it('rejects OAuth callbacks that include a Google error', async () => {
    let server = createMockServer()
    let response = createMockResponse()
    let authorizationCodePromise = waitForAuthorizationCode(
      server,
      'expected-state',
    )

    server.emit(
      'request',
      {
        url: '/oauth2/callback?state=expected-state&error=access_denied',
        headers: {
          host: '127.0.0.1:56125',
        },
      },
      response,
    )

    await expect(authorizationCodePromise).rejects.toThrow(
      'Google OAuth failed: access_denied',
    )

    expect(response.statusCode).toBe(400)
    expect(response.end).toHaveBeenCalledWith(
      'Pinbook authorization failed. You can close this tab.',
    )
  })

  it('rejects callbacks whose state does not match', async () => {
    let server = createMockServer()
    let response = createMockResponse()
    let authorizationCodePromise = waitForAuthorizationCode(
      server,
      'expected-state',
    )

    server.emit(
      'request',
      {
        url: '/oauth2/callback?state=wrong-state&code=authorization-code',
        headers: {
          host: '127.0.0.1:56125',
        },
      },
      response,
    )

    await expect(authorizationCodePromise).rejects.toThrow(
      'Google OAuth state mismatch.',
    )

    expect(response.statusCode).toBe(400)
  })

  it('rejects callbacks that do not include a code', async () => {
    let server = createMockServer()
    let response = createMockResponse()
    let authorizationCodePromise = waitForAuthorizationCode(
      server,
      'expected-state',
    )

    server.emit(
      'request',
      {
        headers: {
          host: '127.0.0.1:56125',
        },
        url: '/oauth2/callback?state=expected-state',
      },
      response,
    )

    await expect(authorizationCodePromise).rejects.toThrow(
      'Google OAuth callback did not include a code.',
    )

    expect(response.statusCode).toBe(400)
  })

  it('rejects unexpected parsing errors from the callback request', async () => {
    let server = createMockServer()
    let response = createMockResponse()
    let authorizationCodePromise = waitForAuthorizationCode(
      server,
      'expected-state',
    )

    server.emit(
      'request',
      {
        url: '/oauth2/callback?state=expected-state&code=authorization-code',
        get headers() {
          throw new Error('boom')
        },
      },
      response,
    )

    await expect(authorizationCodePromise).rejects.toThrow('boom')
  })

  it('times out when no callback arrives', async () => {
    vi.useFakeTimers()

    let server = createMockServer()
    let authorizationCodePromise = waitForAuthorizationCode(
      server,
      'expected-state',
    )

    await Promise.all([
      expect(authorizationCodePromise).rejects.toThrow(
        'Timed out waiting for the Google OAuth callback.',
      ),
      vi.advanceTimersByTimeAsync(5 * 60 * 1000),
    ])
  })
})
