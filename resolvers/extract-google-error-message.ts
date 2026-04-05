import { hasStringField } from './has-string-field'

/**
 * Extracts the most useful human-readable message from a Google API response.
 *
 * @param payload - Parsed API response payload.
 * @returns Error message string suitable for CLI output.
 */
export function extractGoogleErrorMessage(payload: unknown): string {
  if (
    hasObjectField(payload, 'error') &&
    hasStringField(payload.error, 'message')
  ) {
    return payload.error.message
  }

  if (hasStringField(payload, 'error_description')) {
    return payload.error_description
  }

  if (hasStringField(payload, 'message')) {
    return payload.message
  }

  if (hasStringField(payload, 'error')) {
    return payload.error
  }

  return 'Unknown error.'
}

/**
 * Checks whether an unknown object contains a nested object property.
 *
 * @param value - Candidate object to inspect.
 * @param key - Property name that should contain an object.
 * @returns `true` when the property exists and contains an object.
 */
function hasObjectField<Key extends string>(
  value: unknown,
  key: Key,
): value is Record<Key, Record<string, unknown>> {
  let record = value as Record<Key, unknown>

  return (
    typeof value === 'object' &&
    value !== null &&
    key in value &&
    typeof record[key] === 'object' &&
    record[key] !== null
  )
}
