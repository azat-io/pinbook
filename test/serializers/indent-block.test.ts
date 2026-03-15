import { describe, expect, it } from 'vitest'

import { indentBlock } from '../../serializers/indent-block'

describe('indentBlock', () => {
  it('adds the requested indentation to each line', () => {
    expect(indentBlock('alpha\nbeta', 2)).toBe('  alpha\n  beta')
  })

  it('keeps blank lines while indenting them', () => {
    expect(indentBlock('alpha\n\nbeta', 4)).toBe('    alpha\n    \n    beta')
  })
})
