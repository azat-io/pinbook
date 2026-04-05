import type { Command } from '../types/command'

let commandUsageByName: Record<Command, string> = {
  'drive-auth': [
    'Usage: pinbook drive-auth [path]',
    '',
    'Authorize Google Drive uploads for local photo paths.',
  ].join('\n'),
  build: [
    'Usage: pinbook build [path]',
    '',
    'Build `index.yaml` into `.pinbook/map.kml` for Google My Maps.',
  ].join('\n'),
  create: [
    'Usage: pinbook create [directory]',
    '',
    'Scaffold a new Pinbook YAML map project.',
  ].join('\n'),
}

export let helpMessage = [
  'Usage: pinbook <command> [options]',
  '',
  'Build Google My Maps-ready KML from a readable YAML map config.',
  '',
  'Commands:',
  '  build [path]        Build `index.yaml` into `.pinbook/map.kml`',
  '  create [directory]  Scaffold a new Pinbook map project',
  '  drive-auth [path]   Authorize Google Drive uploads',
  '',
  'Flags:',
  '  -h, --help',
  '  -v, --version',
].join('\n')

/**
 * Returns the usage string for a supported CLI command.
 *
 * @param command - CLI command name.
 * @returns Usage string for the requested command.
 */
export function getCommandUsage(command: Command): string {
  return commandUsageByName[command]
}
