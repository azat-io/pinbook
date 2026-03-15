import { describe, expect, it } from 'vitest'

import { exportKml } from '../../serializers/export-kml'
import { serializerConfig } from './fixtures'

describe('exportKml', () => {
  it('serializes a full KML document with styles and placemarks', () => {
    let kml = exportKml(serializerConfig)

    expect(kml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">')
    expect(kml).toContain('<name>Kyoto &amp; Osaka</name>')
    expect(kml).toContain('<description/>')
    expect(kml).toContain('    <StyleMap id="icon-1523-F44336">')
    expect(kml).toContain('    <Folder>')
    expect(kml).toContain('      <Placemark>')
  })

  it('includes the map description when documentDescription is enabled', () => {
    let kml = exportKml(serializerConfig, {
      documentDescription: true,
    })

    expect(kml).toContain(
      '<description>Spring &lt;trip&gt; &amp; notes</description>',
    )
    expect(kml).not.toContain('<description/>')
  })

  it('trims trailing newlines from the document description', () => {
    let kml = exportKml(
      {
        ...serializerConfig,
        map: {
          ...serializerConfig.map,
          description: 'Trip summary\n',
        },
      },
      {
        documentDescription: true,
      },
    )

    expect(kml).toContain('    <description>Trip summary</description>')
    expect(kml).not.toContain('Trip summary\n</description>')
  })
})
