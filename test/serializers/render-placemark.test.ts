import { describe, expect, it } from 'vitest'

import { renderPlacemark } from '../../serializers/render-placemark'
import { pinWithoutLayer, sightsPin } from './fixtures'

describe('renderPlacemark', () => {
  it('renders escaped content and lng-lat coordinates', () => {
    let placemark = renderPlacemark(sightsPin)

    expect(placemark).toBe(
      [
        '<Placemark>',
        '  <name>Fushimi &amp; Inari</name>',
        '  <description>Torii &lt;gates&gt; &amp; crowds</description>',
        '  <styleUrl>#icon-1523-F44336</styleUrl>',
        '  <Point>',
        '    <coordinates>135.7727,34.9671,0</coordinates>',
        '  </Point>',
        '</Placemark>',
      ].join('\n'),
    )
  })

  it('omits the description tag when a pin has no description', () => {
    expect(renderPlacemark(pinWithoutLayer)).not.toContain('<description>')
  })

  it('trims trailing newlines from descriptions', () => {
    expect(
      renderPlacemark({
        ...sightsPin,
        description: 'Ends with newline\n',
      }),
    ).toContain('<description>Ends with newline</description>')
  })

  it('renders photo urls inside a CDATA description and gx_media_links', () => {
    let placemark = renderPlacemark({
      ...sightsPin,
      photo: 'https://example.com/photos/fushimi.jpg?tag=a&lang=en',
    })

    expect(placemark).toContain(
      '<description><![CDATA[<img src="https://example.com/photos/fushimi.jpg?tag=a&amp;lang=en" width="300" height="200" /><br>Torii &lt;gates&gt; &amp; crowds]]></description>',
    )
    expect(placemark).toContain('<ExtendedData>')
    expect(placemark).toContain('<Data name="gx_media_links">')
    expect(placemark).toContain(
      '<value><![CDATA[https://example.com/photos/fushimi.jpg?tag=a&lang=en]]></value>',
    )
    expect(placemark).not.toContain('<br><br>')
  })

  it('renders multiple photo urls inside the description and gx_media_links', () => {
    let placemark = renderPlacemark({
      ...sightsPin,
      photo: [
        'https://example.com/photos/fushimi-front.jpg',
        'https://example.com/photos/fushimi-gate.jpg?view=detail&lang=en',
      ],
    })

    expect(placemark).toContain(
      '<description><![CDATA[<img src="https://example.com/photos/fushimi-front.jpg" width="300" height="200" /><br><img src="https://example.com/photos/fushimi-gate.jpg?view=detail&amp;lang=en" width="300" height="200" /><br>Torii &lt;gates&gt; &amp; crowds]]></description>',
    )
    expect(placemark).toContain(
      '<value><![CDATA[https://example.com/photos/fushimi-front.jpg]]></value>',
    )
    expect(placemark).toContain(
      '<value><![CDATA[https://example.com/photos/fushimi-gate.jpg?view=detail&lang=en]]></value>',
    )
  })

  it('renders a photo without appending an empty text block when description is missing', () => {
    let placemark = renderPlacemark({
      ...pinWithoutLayer,
      photo: 'https://example.com/photos/kyoto-station.jpg',
    })

    expect(placemark).toContain(
      '<description><![CDATA[<img src="https://example.com/photos/kyoto-station.jpg" width="300" height="200" />]]></description>',
    )
    expect(placemark).not.toContain('<br><br>')
  })
})
