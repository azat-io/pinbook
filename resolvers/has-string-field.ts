/**
 * Checks whether an unknown object contains a non-empty string property.
 *
 * @param value - Candidate object to inspect.
 * @param key - Property name that should contain a string.
 * @returns `true` when the property exists and contains a non-empty string.
 */
export function hasStringField<Key extends string>(
  value: unknown,
  key: Key,
): value is Record<Key, string> {
  let record = value as Record<Key, unknown>

  return (
    typeof value === 'object' &&
    value !== null &&
    key in value &&
    typeof record[key] === 'string' &&
    record[key].trim() !== ''
  )
}
