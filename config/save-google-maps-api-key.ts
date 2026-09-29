import { saveLocalEnvironment } from './save-local-environment'

/**
 * Persists the Google Maps API key to a local `.env` file next to the YAML
 * config file and ensures that `.env` is ignored by Git in that directory.
 *
 * @param filePath - Path to the YAML config file.
 * @param apiKey - Google Maps API key to persist.
 */
export async function saveGoogleMapsApiKey(
  filePath: string,
  apiKey: string,
): Promise<void> {
  await saveLocalEnvironment(filePath, {
    GOOGLE_MAPS_API_KEY: apiKey,
  })
}
