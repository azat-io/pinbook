import type { createServer } from 'node:http'

import { toError } from './to-error'

/**
 * Waits for a single OAuth callback request on the temporary local server and
 * extracts its authorization code.
 *
 * @param server - Local HTTP server listening for the callback.
 * @param expectedState - Anti-CSRF state value that must match the callback.
 * @returns Authorization code from Google's redirect request.
 */
export function waitForAuthorizationCode(
  server: ReturnType<typeof createServer>,
  expectedState: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let timeout = setTimeout(
      () => {
        reject(new Error('Timed out waiting for the Google OAuth callback.'))
      },
      5 * 60 * 1000,
    )

    server.once('request', (request, response) => {
      try {
        let origin = `http://${request.headers.host ?? '127.0.0.1'}`
        let requestUrl = new URL(request.url ?? '/', origin)

        if (requestUrl.pathname !== '/oauth2/callback') {
          response.statusCode = 404
          response.end('Not found')
          reject(new Error('Unexpected Google OAuth callback path.'))

          return
        }

        let error = requestUrl.searchParams.get('error')

        if (error) {
          response.statusCode = 400
          response.end('Pinbook authorization failed. You can close this tab.')
          reject(new Error(`Google OAuth failed: ${error}`))

          return
        }

        if (requestUrl.searchParams.get('state') !== expectedState) {
          response.statusCode = 400
          response.end('Pinbook authorization failed. You can close this tab.')
          reject(new Error('Google OAuth state mismatch.'))

          return
        }

        let authorizationCode = requestUrl.searchParams.get('code')

        if (!authorizationCode) {
          response.statusCode = 400
          response.end('Pinbook authorization failed. You can close this tab.')
          reject(new Error('Google OAuth callback did not include a code.'))

          return
        }

        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(
          '<!doctype html><title>Pinbook</title><p>Pinbook authorization complete. You can close this tab.</p>',
        )
        resolve(authorizationCode)
      } catch (error) {
        reject(toError(error))
      } finally {
        clearTimeout(timeout)
      }
    })
  })
}
