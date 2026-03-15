import type { LocationResolutionIssue } from '../types/location-resolution-issue'
import type { ResolveConfigOptions } from '../types/resolve-config-options'
import type { ResolvedMapConfig } from '../types/resolved-map-config'
import type { MapConfigSchema } from '../schema/map-config-schema'
import type { ResolvedPin } from '../types/resolved-pin'

import { geocodeAddressWithGoogle } from './geocode-address-with-google'
import { loadResolutionCache } from './load-resolution-cache'
import { saveResolutionCache } from './save-resolution-cache'

/**
 * Error thrown when one or more pin addresses cannot be resolved.
 */
export class LocationResolutionError extends Error {
  /**
   * List of unresolved pin identifiers and addresses.
   */
  public unresolvedLocations: LocationResolutionIssue[]

  /**
   * Creates a location resolution error with unresolved address entries.
   *
   * @param unresolvedLocations - Unresolved pin identifiers and addresses.
   */
  public constructor(unresolvedLocations: LocationResolutionIssue[]) {
    super('Location resolution failed')
    this.name = 'LocationResolutionError'
    this.unresolvedLocations = unresolvedLocations
  }
}

/**
 * Resolves all pins in a validated config so that each pin has coordinates.
 *
 * @param config - Validated map config to resolve.
 * @param options - Options that control cache lookup.
 * @returns A map config whose pins all contain resolved coordinates.
 */
export async function resolveConfig(
  config: MapConfigSchema,
  options: ResolveConfigOptions = {},
): Promise<ResolvedMapConfig> {
  let cache = await loadResolutionCache(options.cachePath)
  let addresses = { ...cache.addresses }
  let unresolvedLocations: LocationResolutionIssue[] = []
  let uncachedPins = config.pins.filter(
    pin => !pin.coords && pin.address && !addresses[pin.address],
  )
  let missingAddresses = [...new Set(uncachedPins.map(pin => pin.address!))]

  if (missingAddresses.length > 0 && !options.googleMapsApiKey) {
    let error = new Error(
      'Pins with addresses require the GOOGLE_MAPS_API_KEY environment variable when coordinates are missing from the cache.',
    )

    error.name = 'GoogleMapsApiKeyMissingError'

    throw error
  }

  let geocodedAddresses = await Promise.all(
    missingAddresses.map(async address => ({
      coordinates: await geocodeAddressWithGoogle(
        address,
        options.googleMapsApiKey!,
      ),
      address,
    })),
  )

  for (let geocodedAddress of geocodedAddresses) {
    if (geocodedAddress.coordinates) {
      addresses[geocodedAddress.address] = geocodedAddress.coordinates
    }
  }

  if (missingAddresses.some(address => addresses[address])) {
    await saveResolutionCache(
      {
        ...cache,
        addresses,
      },
      options.cachePath,
    )
  }

  let resolvedPins = config.pins
    .map(pin => {
      if (pin.coords) {
        return {
          ...pin,
          coords: pin.coords,
        } satisfies ResolvedPin
      }

      let address = pin.address!
      let resolvedCoordinates = addresses[address]

      if (!resolvedCoordinates) {
        unresolvedLocations.push({
          pinId: pin.id,
          address,
        })

        return null
      }

      return {
        ...pin,
        coords: resolvedCoordinates,
      } satisfies ResolvedPin
    })
    .filter(pin => pin !== null)

  if (unresolvedLocations.length > 0) {
    throw new LocationResolutionError(unresolvedLocations)
  }

  return {
    ...config,
    pins: resolvedPins,
  }
}
