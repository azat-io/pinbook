import { describe, expect, it } from 'vitest'

import { escapeXml } from '../../serializers/escape-xml'

describe('escapeXml', () => {
  it('escapes XML-sensitive characters', () => {
    expect(escapeXml(`A&B <tag> "quote" 'apostrophe'`)).toBe(
      'A&amp;B &lt;tag&gt; &quot;quote&quot; &apos;apostrophe&apos;',
    )
  })
})
