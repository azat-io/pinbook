import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { exchangeAuthorizationCodeForRefreshToken } from '../../../commands/drive-auth/exchange-authorization-code-for-refresh-token'

let originalFetch = globalThis.fetch

function getExchangeOptions(): {
  authorizationCode: string
  clientSecret: string
  redirectUri: string
  clientId: string
} {
  return {
    redirectUri: 'http://127.0.0.1:56125/oauth2/callback',
    authorizationCode: 'authorization-code',
    clientSecret: 'client-secret',
    clientId: 'client-id',
  }
}

describe('exchangeAuthorizationCodeForRefreshToken', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(vi.fn<typeof fetch>())
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('exchanges the authorization code for a refresh token', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          // eslint-disable-next-line camelcase
          refresh_token: 'refresh-token',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).resolves.toBe('refresh-token')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('surfaces a generic network failure message from fetch', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(
      new Error('network unavailable'),
    )

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).rejects.toThrow('Google OAuth token exchange failed: network unavailable')
  })

  it('surfaces a timeout while contacting Google', async () => {
    let timeoutError = new Error('request timed out')

    timeoutError.name = 'TimeoutError'
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(timeoutError)

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).rejects.toThrow(
      'Google OAuth token exchange failed: request timed out while contacting oauth2.googleapis.com.',
    )
  })

  it('wraps non-Error fetch failures into a normal Error message', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce('network unavailable')

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).rejects.toThrow('Google OAuth token exchange failed: network unavailable')
  })

  it('surfaces error_description responses from Google', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          // eslint-disable-next-line camelcase
          error_description: 'authorization code expired',
        }),
        {
          status: 400,
        },
      ),
    )

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).rejects.toThrow(
      'Google OAuth token exchange failed: authorization code expired',
    )
  })

  it('surfaces string error responses from Google', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'access_denied',
        }),
        {
          status: 400,
        },
      ),
    )

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).rejects.toThrow('Google OAuth token exchange failed: access_denied')
  })

  it('surfaces raw text responses from Google as error messages', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('oauth gateway failed', {
        status: 502,
      }),
    )

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).rejects.toThrow(
      'Google OAuth token exchange failed: oauth gateway failed',
    )
  })

  it('falls back to an unknown error for empty error responses', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('', {
        status: 500,
      }),
    )

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).rejects.toThrow('Google OAuth token exchange failed: Unknown error.')
  })

  it('rejects successful responses that omit the refresh token', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          // eslint-disable-next-line camelcase
          access_token: 'access-token',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).rejects.toThrow(
      'Google OAuth token exchange succeeded but did not return a refresh token.',
    )
  })

  it('rejects successful responses whose refresh token is blank', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          // eslint-disable-next-line camelcase
          refresh_token: '   ',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      exchangeAuthorizationCodeForRefreshToken(getExchangeOptions()),
    ).rejects.toThrow(
      'Google OAuth token exchange succeeded but did not return a refresh token.',
    )
  })
})
