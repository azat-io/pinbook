import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { log } from '@clack/prompts'

import { exchangeAuthorizationCodeForRefreshToken } from './exchange-authorization-code-for-refresh-token'
import { waitForAuthorizationCode } from './wait-for-authorization-code'

/**
 * OAuth desktop client credentials used during the interactive Drive auth flow.
 */
interface OAuthClientCredentials {
  /**
   * OAuth 2.0 desktop client secret from Google Cloud.
   */
  clientSecret: string

  /**
   * OAuth 2.0 desktop client identifier from Google Cloud.
   */
  clientId: string
}

/**
 * Starts a temporary local OAuth callback server and exchanges the returned
 * authorization code for a refresh token.
 *
 * @param credentials - OAuth desktop client credentials.
 * @returns Refresh token that can be stored for later Drive uploads.
 */
export async function requestGoogleDriveRefreshToken(
  credentials: OAuthClientCredentials,
): Promise<string> {
  let server = createServer()

  try {
    await listen(server)

    let redirectUri = getOauthRedirectUri(server.address())
    let state = randomBytes(16).toString('hex')

    log.info('Open this URL in a browser and finish the Google sign-in flow:')
    log.info(
      buildGoogleAuthorizationUrl(credentials.clientId, redirectUri, state),
    )

    let authorizationCode = await waitForAuthorizationCode(server, state)

    log.info(
      'Google authorization code received. Exchanging it for a refresh token...',
    )

    return exchangeAuthorizationCodeForRefreshToken({
      clientSecret: credentials.clientSecret,
      clientId: credentials.clientId,
      authorizationCode,
      redirectUri,
    })
  } finally {
    await closeServer(server)
  }
}

/**
 * Builds the Google OAuth authorization URL for the local callback flow.
 *
 * @param clientId - OAuth desktop client id.
 * @param redirectUri - Local callback URI served by Pinbook.
 * @param state - Anti-CSRF state token.
 * @returns Fully qualified Google authorization URL.
 */
function buildGoogleAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  let authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')

  authorizationUrl.searchParams.set('access_type', 'offline')
  authorizationUrl.searchParams.set('client_id', clientId)
  authorizationUrl.searchParams.set(
    'scope',
    'https://www.googleapis.com/auth/drive.file',
  )
  authorizationUrl.searchParams.set('include_granted_scopes', 'true')
  authorizationUrl.searchParams.set('prompt', 'consent')
  authorizationUrl.searchParams.set('redirect_uri', redirectUri)
  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('state', state)

  return authorizationUrl.toString()
}

/**
 * Resolves the local OAuth redirect URI from a listening HTTP server address.
 *
 * @param address - Bound address returned by the temporary local HTTP server.
 * @returns Callback URI that Google should redirect the browser to.
 */
function getOauthRedirectUri(
  address: ReturnType<ReturnType<typeof createServer>['address']>,
): string {
  if (!address || typeof address === 'string') {
    throw new Error('Could not determine local OAuth callback port.')
  }

  return `http://127.0.0.1:${address.port}/oauth2/callback`
}

/**
 * Starts the temporary local HTTP server on an ephemeral port.
 *
 * @param server - Server instance that should start listening.
 * @returns Promise that resolves once the server is ready.
 */
function listen(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
}

/**
 * Stops the temporary local HTTP server.
 *
 * @param server - Server instance that should be closed.
 * @returns Promise that resolves once the server is fully closed.
 */
function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise(resolve => {
    server.close(() => {
      resolve()
    })
  })
}
