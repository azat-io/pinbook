/**
 * Normalizes an unknown thrown value into an `Error` instance.
 *
 * @param error - Unknown thrown value.
 * @returns Original `Error` instance or a wrapped fallback error.
 */
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
