import { describe, expect, it } from 'vitest'

import { splitLines } from '../../config/split-lines'

describe('splitLines', () => {
  it('should return empty array for empty content', () => {
    expect(splitLines('')).toEqual([])
  })

  it('should split content into non-empty lines', () => {
    let content = 'line 1\nline 2\r\nline 3\n\nline 4\r\n'
    let expectedLines = ['line 1', 'line 2', 'line 3', 'line 4']

    expect(splitLines(content)).toEqual(expectedLines)
  })
})
