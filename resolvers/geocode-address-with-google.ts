/**
 * Partial Google Geocoding API response body used by the resolver.
 */
interface GoogleGeocodingResponse {
  /**
   * Geocoding candidates returned by Google.
   */
  results?: GoogleGeocodingResult[]

  /**
   * Human-readable Google API error detail when available.
   */
  error_message?: string

  /**
   * Top-level Google Geocoding API status.
   */
  status?: string
}

/**
 * Additional metadata attached to a Google geocoding error.
 */
interface GoogleGeocodingErrorMetadata {
  /**
   * Whether the failure can likely be fixed by replacing the API key.
   */
  isInvalidApiKey?: boolean

  /**
   * Google Geocoding API status associated with the failure.
   */
  status?: string
}

/**
 * Raw geographic coordinates returned by Google.
 */
interface GoogleGeocodingLocation {
  /**
   * Latitude component of the resolved point.
   */
  lat?: number

  /**
   * Longitude component of the resolved point.
   */
  lng?: number
}

/**
 * Geometry container for a single Google geocoding result.
 */
interface GoogleGeocodingGeometry {
  /**
   * Geographic point for the matched result.
   */
  location?: GoogleGeocodingLocation
}

/**
 * Single Google geocoding result entry.
 */
interface GoogleGeocodingResult {
  /**
   * Geometry payload for the matched result.
   */
  geometry?: GoogleGeocodingGeometry
}

/**
 * Resolves a single address via the Google Maps Geocoding API.
 *
 * Returns `null` when Google explicitly reports `ZERO_RESULTS`. Throws a named
 * error for transport failures, denied requests, malformed responses, and other
 * API-level failures.
 *
 * @param address - Human-readable address to geocode.
 * @param apiKey - Google Maps API key.
 * @returns Coordinates in `[lat, lng]` format or `null` when no result exists.
 */
export async function geocodeAddressWithGoogle(
  address: string,
  apiKey: string,
): Promise<[number, number] | null> {
  let url = new URL('https://maps.googleapis.com/maps/api/geocode/json')

  url.search = new URLSearchParams({
    key: apiKey,
    address,
  }).toString()

  let response: Response

  try {
    response = await fetch(url)
  } catch (error) {
    throw createGoogleGeocodingError(
      `Request failed: ${error instanceof Error ? error.message : 'Unknown transport error'}.`,
    )
  }

  if (!response.ok) {
    throw createGoogleGeocodingError(
      `Request failed with HTTP ${response.status}.`,
    )
  }

  let body = (await response.json()) as GoogleGeocodingResponse

  if (body.status === 'ZERO_RESULTS') {
    return null
  }

  if (body.status !== 'OK') {
    let detail =
      typeof body.error_message === 'string' && body.error_message !== '' ?
        ` ${body.error_message}`
      : ''
    let isInvalidApiKey =
      body.status === 'REQUEST_DENIED' &&
      body.error_message === 'The provided API key is invalid.'

    throw createGoogleGeocodingError(
      `Google returned status ${body.status ?? 'UNKNOWN'}.${detail}`,
      {
        status: body.status,
        isInvalidApiKey,
      },
    )
  }

  let location = body.results?.[0]?.geometry?.location

  if (typeof location?.lat !== 'number' || typeof location.lng !== 'number') {
    throw createGoogleGeocodingError(
      'Google returned a response without valid coordinates.',
    )
  }

  return [location.lat, location.lng]
}

/**
 * Creates a named geocoding error for Google transport and API failures.
 *
 * @param message - Human-readable error description.
 * @param metadata - Structured details about the Google geocoding failure.
 * @returns Error tagged with the `GoogleGeocodingError` name.
 */
function createGoogleGeocodingError(
  message: string,
  metadata: GoogleGeocodingErrorMetadata = {},
): Error {
  let error = new Error(message)

  error.name = 'GoogleGeocodingError'

  return Object.assign(error, metadata)
}
