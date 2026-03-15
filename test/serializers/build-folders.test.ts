import { describe, expect, it } from 'vitest'

import { buildFolders } from '../../serializers/build-folders'
import { serializerConfig } from './fixtures'

describe('buildFolders', () => {
  it('renders folders for known layers and leaves unresolved layers as top-level placemarks', () => {
    let folders = buildFolders(serializerConfig)

    expect(folders).toMatch(
      /<Folder>\s*<name>Sights &amp; Views<\/name>\s*<description>Top &lt;places&gt; &amp; views<\/description>/u,
    )
    expect(folders).toMatch(
      /<Folder>\s*<name>Food Stops<\/name>\s*<Placemark>/u,
    )
    expect(folders).toContain('<name>Kyoto &quot;Station&quot;</name>')
    expect(folders).toContain('<name>Mystery &lt;Place&gt;</name>')
  })
})
