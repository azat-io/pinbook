import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { geocodeAddressWithGoogle } from '../../resolvers/geocode-address-with-google'

let fetchMock = vi.fn<typeof fetch>()
let originalFetch = globalThis.fetch

describe('geocodeAddressWithGoogle', () => {
  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns coordinates for a successful Google geocoding response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              geometry: {
                location: {
                  lng: 139.7967,
                  lat: 35.7148,
                },
              },
            },
          ],
          status: 'OK',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      geocodeAddressWithGoogle('Senso-ji, Tokyo', 'test-key'),
    ).resolves.toEqual([35.7148, 139.7967])
  })

  it('returns null when Google reports zero results', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'ZERO_RESULTS',
          results: [],
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      geocodeAddressWithGoogle('Missing Place, Tokyo', 'test-key'),
    ).resolves.toBeNull()
  })

  it('throws a named error when Google returns an API-level failure', async () => {
    let responseBody = {
      // eslint-disable-next-line camelcase
      error_message: 'The provided API key is invalid.',
      status: 'REQUEST_DENIED',
    }

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(responseBody), {
        status: 200,
      }),
    )

    await expect(
      geocodeAddressWithGoogle('Senso-ji, Tokyo', 'test-key'),
    ).rejects.toMatchObject({
      message:
        'Google returned status REQUEST_DENIED. The provided API key is invalid.',
      name: 'GoogleGeocodingError',
      status: 'REQUEST_DENIED',
      isInvalidApiKey: true,
    })
  })

  it('throws a named error when the HTTP request fails', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 500,
      }),
    )

    await expect(
      geocodeAddressWithGoogle('Senso-ji, Tokyo', 'test-key'),
    ).rejects.toMatchObject({
      message: 'Request failed with HTTP 500.',
      name: 'GoogleGeocodingError',
    })
  })

  it('throws a named error when the transport request rejects', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

    await expect(
      geocodeAddressWithGoogle('Senso-ji, Tokyo', 'test-key'),
    ).rejects.toMatchObject({
      message: 'Request failed: fetch failed.',
      name: 'GoogleGeocodingError',
    })
  })

  it('falls back to an unknown transport error message for non-Error rejections', async () => {
    fetchMock.mockRejectedValueOnce('boom')

    await expect(
      geocodeAddressWithGoogle('Senso-ji, Tokyo', 'test-key'),
    ).rejects.toMatchObject({
      message: 'Request failed: Unknown transport error.',
      name: 'GoogleGeocodingError',
    })
  })

  it('throws a named error when Google omits valid coordinates', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              geometry: {
                location: {
                  lat: 35.7148,
                },
              },
            },
          ],
          status: 'OK',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      geocodeAddressWithGoogle('Senso-ji, Tokyo', 'test-key'),
    ).rejects.toMatchObject({
      message: 'Google returned a response without valid coordinates.',
      name: 'GoogleGeocodingError',
    })
  })

  it('throws a named error when Google returns a non-OK status without details', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'OVER_QUERY_LIMIT',
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      geocodeAddressWithGoogle('Senso-ji, Tokyo', 'test-key'),
    ).rejects.toMatchObject({
      message: 'Google returned status OVER_QUERY_LIMIT.',
      name: 'GoogleGeocodingError',
      status: 'OVER_QUERY_LIMIT',
      isInvalidApiKey: false,
    })
  })

  it('throws a named error when Google omits the status field', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [],
        }),
        {
          status: 200,
        },
      ),
    )

    await expect(
      geocodeAddressWithGoogle('Senso-ji, Tokyo', 'test-key'),
    ).rejects.toMatchObject({
      message: 'Google returned status UNKNOWN.',
      name: 'GoogleGeocodingError',
    })
  })
})
