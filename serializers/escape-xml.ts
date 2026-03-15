/**
 * Escapes XML-sensitive characters in user-provided text.
 *
 * @param value - Raw text value to escape.
 * @returns XML-safe text.
 */
export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
