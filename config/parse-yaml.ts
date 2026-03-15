import { parse } from 'yaml'

/**
 * Parses YAML source text into an arbitrary JavaScript value.
 *
 * @param source - Raw YAML document contents.
 * @returns Parsed YAML value.
 */
export function parseYaml(source: string): unknown {
  return parse(source)
}
