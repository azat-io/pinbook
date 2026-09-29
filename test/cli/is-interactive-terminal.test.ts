import { afterEach, describe, expect, it } from 'vitest'

import { isInteractiveTerminal } from '../../cli/is-interactive-terminal'

let originalStdinIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')
let originalStdoutIsTTY = Object.getOwnPropertyDescriptor(
  process.stdout,
  'isTTY',
)

function restoreIsTTY(
  stream: NodeJS.WriteStream | NodeJS.ReadStream,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(stream, 'isTTY', descriptor)
  } else {
    Reflect.deleteProperty(stream, 'isTTY')
  }
}

function setIsTTY(
  stream: NodeJS.WriteStream | NodeJS.ReadStream,
  isTTY: boolean,
): void {
  Object.defineProperty(stream, 'isTTY', {
    configurable: true,
    value: isTTY,
  })
}

describe('isInteractiveTerminal', () => {
  afterEach(() => {
    restoreIsTTY(process.stdin, originalStdinIsTTY)
    restoreIsTTY(process.stdout, originalStdoutIsTTY)
  })

  it('returns true when both stdin and stdout are TTY streams', () => {
    setIsTTY(process.stdin, true)
    setIsTTY(process.stdout, true)

    expect(isInteractiveTerminal()).toBeTruthy()
  })

  it('returns false when stdin is not a TTY stream', () => {
    setIsTTY(process.stdin, false)
    setIsTTY(process.stdout, true)

    expect(isInteractiveTerminal()).toBeFalsy()
  })

  it('returns false when stdout is not a TTY stream', () => {
    setIsTTY(process.stdin, true)
    setIsTTY(process.stdout, false)

    expect(isInteractiveTerminal()).toBeFalsy()
  })
})
