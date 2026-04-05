import { readJsonResponse } from '../../resolvers/read-json-response'
import { hasStringField } from '../../resolvers/has-string-field'
import { toError } from './to-error'

/**
 * Parameters required to exchange a Google OAuth authorization code for a
 * refresh token.
 */
interface ExchangeAuthorizationCodeForRefreshTokenOptions {
  /**
   * One-time authorization code returned by Google's OAuth callback.
   */
  authorizationCode: string

  /**
   * OAuth 2.0 desktop client secret from Google Cloud.
   */
  clientSecret: string

  /**
   * Local callback URI that was used during the browser authorization step.
   */
  redirectUri: string

  /**
   * OAuth 2.0 desktop client identifier from Google Cloud.
   */
  clientId: string
}

/**
 * Maximum time to wait for Google's token exchange response.
 */
let tokenExchangeTimeoutMs = 30_000

/**
 * Exchanges a one-time Google OAuth authorization code for a persistent refresh
 * token.
 *
 * @param options - OAuth token exchange parameters.
 * @returns Refresh token that can be stored for later Drive uploads.
 */
export async function exchangeAuthorizationCodeForRefreshToken(
  options: ExchangeAuthorizationCodeForRefreshTokenOptions,
): Promise<string> {
  /* eslint-disable camelcase */
  let response: Response

  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      body: new URLSearchParams({
        client_secret: options.clientSecret,
        redirect_uri: options.redirectUri,
        grant_type: 'authorization_code',
        code: options.authorizationCode,
        client_id: options.clientId,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: AbortSignal.timeout(tokenExchangeTimeoutMs),
      method: 'POST',
    })
  } catch (error) {
    throw new Error(
      `Google OAuth token exchange failed: ${extractNetworkErrorMessage(error)}`,
      {
        cause: error,
      },
    )
  }
  /* eslint-enable camelcase */

  let payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new Error(
      `Google OAuth token exchange failed: ${extractOauthErrorMessage(payload)}`,
    )
  }

  if (!hasStringField(payload, 'refresh_token')) {
    throw new Error(
      'Google OAuth token exchange succeeded but did not return a refresh token.',
    )
  }

  return payload.refresh_token
}

/**
 * Extracts the most useful human-readable message from an OAuth token response.
 *
 * @param payload - Parsed token response payload.
 * @returns Error message string suitable for CLI output.
 */
function extractOauthErrorMessage(payload: unknown): string {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error_description' in payload &&
    typeof payload.error_description === 'string'
  ) {
    return payload.error_description
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message
  }

  return 'Unknown error.'
}
/**
 * Extracts a human-readable message from a network-level fetch failure.
 *
 * @param error - Unknown fetch rejection reason.
 * @returns Error message suitable for CLI output.
 */
function extractNetworkErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  ) {
    return 'request timed out while contacting oauth2.googleapis.com.'
  }

  return toError(error).message
}
