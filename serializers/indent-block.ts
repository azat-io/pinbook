/**
 * Applies a left indentation prefix to every line in a multi-line block.
 *
 * @param value - Multi-line text block to indent.
 * @param spaces - Number of spaces to prefix on each line.
 * @returns The block with every line indented by the requested amount.
 */
export function indentBlock(value: string, spaces: number): string {
  let prefix = ' '.repeat(spaces)

  return value
    .split('\n')
    .map(line => `${prefix}${line}`)
    .join('\n')
}
