import { describe, expect, it } from 'vitest'

import { buildStyles } from '../../serializers/build-styles'
import { serializerConfig } from './fixtures'

describe('buildStyles', () => {
  it('renders unique style blocks for each color and icon combination', () => {
    let styles = buildStyles(serializerConfig)

    expect(styles).toContain('<StyleMap id="icon-1523-F44336">')
    expect(styles).toContain('<StyleMap id="icon-1577-FF9800">')
    expect(styles).toContain('<StyleMap id="icon-1636-9C27B0">')
    expect(styles.match(/<StyleMap id="/gu)).toHaveLength(3)
    expect(styles.match(/<Style id="/gu)).toHaveLength(6)
  })
})
