import type { Arguments } from 'yargs-parser'

import parser from 'yargs-parser'

/**
 * Represents the command-line flags that can be parsed from the arguments.
 */
interface Flags {
  /**
   * Path-like positional argument passed to the command.
   */
  targetPath?: string

  /**
   * Indicates whether the version flag was provided.
   */
  version?: boolean

  /**
   * Positional CLI command.
   */
  command?: string

  /**
   * Indicates whether the help flag was provided.
   */
  help?: boolean
}

/**
 * Parses command-line flags from the provided arguments.
 *
 * @param arguments_ - An array of command-line arguments to parse.
 * @returns An object containing the parsed flags.
 */
export function parseFlags(arguments_: string[]): Flags {
  let flags: Arguments = parser(arguments_.slice(2), {
    alias: {
      version: ['v'],
      help: ['h'],
    },
    boolean: ['help', 'version'],
  })

  let [command, targetPath] = flags._.map(String)

  return {
    version: flags['version'] as undefined | boolean,
    help: flags['help'] as undefined | boolean,
    targetPath,
    command,
  }
}
