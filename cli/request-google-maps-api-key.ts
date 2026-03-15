import { isCancel, password, log } from '@clack/prompts'

type GoogleMapsApiKeyPromptReason = 'invalid' | 'missing'

/**
 * Requests a Google Maps API key from the user for address geocoding.
 *
 * @param reason - Why the CLI needs a new Google Maps API key.
 * @returns Trimmed API key or `null` when the prompt is canceled.
 */
export async function requestGoogleMapsApiKey(
  reason: GoogleMapsApiKeyPromptReason,
): Promise<string | null> {
  log.info(
    reason === 'invalid' ?
      'Saved Google Maps API key was rejected. Enter a replacement key to retry.'
    : 'Google Maps API key is required to geocode uncached addresses.',
  )

  let promptedGoogleMapsApiKey = await password({
    message:
      reason === 'invalid' ?
        'Enter a replacement Google Maps API key:'
      : 'Enter your Google Maps API key to geocode uncached addresses:',
    validate(value) {
      return !value || value.trim() === '' ?
          'Google Maps API key is required.'
        : undefined
    },
    mask: '*',
  })

  if (isCancel(promptedGoogleMapsApiKey)) {
    return null
  }

  return promptedGoogleMapsApiKey.trim()
}
