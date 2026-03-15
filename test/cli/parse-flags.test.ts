import { describe, expect, it } from 'vitest'

import { parseFlags } from '../../cli/parse-flags'

describe('parseFlags', () => {
  it('parses a command and positional target path', () => {
    expect(parseFlags(['node', 'pinbook', 'build', 'index.yaml'])).toEqual({
      targetPath: 'index.yaml',
      version: undefined,
      command: 'build',
      help: undefined,
    })
  })

  it('parses create without a target path', () => {
    expect(parseFlags(['node', 'pinbook', 'create'])).toEqual({
      targetPath: undefined,
      version: undefined,
      command: 'create',
      help: undefined,
    })
  })
})
