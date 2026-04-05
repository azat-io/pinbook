import { log } from '@clack/prompts'
import 'node:worker_threads'

import { getCommandUsage, helpMessage } from './help'
import { driveAuth } from '../commands/drive-auth'
import { create } from '../commands/create'
import { parseFlags } from './parse-flags'
import { build } from '../commands/build'
import { version } from '../package.json'

/**
 * Runs the Pinbook CLI entry point for the current process arguments.
 *
 * @returns A promise that resolves after command execution finishes.
 */
export async function run(): Promise<void> {
  let flags = parseFlags(process.argv)

  if (flags.version) {
    log.info(version)
    process.exit(0)
  }

  if (!flags.command) {
    log.info(helpMessage)

    return
  }

  if (flags.command === 'build') {
    if (flags.help) {
      log.info(getCommandUsage('build'))

      return
    }

    await build(flags.targetPath)

    return
  }

  if (flags.command === 'create') {
    if (flags.help) {
      log.info(getCommandUsage('create'))

      return
    }

    await create(flags.targetPath)

    return
  }

  if (flags.command === 'drive-auth') {
    if (flags.help) {
      log.info(getCommandUsage('drive-auth'))

      return
    }

    await driveAuth(flags.targetPath)

    return
  }

  log.error('Unknown command')
  log.info(helpMessage)
  process.exitCode = 1
}
