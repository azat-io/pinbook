#!/usr/bin/env node

import { log } from '@clack/prompts'

import { run } from '../dist/cli/index.js'

try {
  await run()
} catch (error) {
  let message = error instanceof Error ? error.message : String(error)

  log.error(message)
  process.exitCode = 1
}
