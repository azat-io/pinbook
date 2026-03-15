/**
 * Splits file content into non-empty lines.
 *
 * @param content - Raw file contents.
 * @returns Normalized non-empty lines.
 */
export function splitLines(content: string): string[] {
  if (content === '') {
    return []
  }

  return content.split(/\r?\n/u).filter(Boolean)
}
