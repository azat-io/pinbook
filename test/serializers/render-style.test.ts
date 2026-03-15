import { describe, expect, it } from 'vitest'

import { renderStyle } from '../../serializers/render-style'

describe('renderStyle', () => {
  it('renders My Maps normal and highlight styles with a style map', () => {
    let style = renderStyle('orange-500', 'places-restaurant')

    expect(style).toBe(
      [
        '<Style id="icon-1577-FF9800-normal">',
        '  <IconStyle>',
        '    <color>ff0098ff</color>',
        '    <scale>1</scale>',
        '    <Icon>',
        '      <href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>',
        '    </Icon>',
        '  </IconStyle>',
        '  <LabelStyle>',
        '    <scale>0</scale>',
        '  </LabelStyle>',
        '</Style>',
        '<Style id="icon-1577-FF9800-highlight">',
        '  <IconStyle>',
        '    <color>ff0098ff</color>',
        '    <scale>1</scale>',
        '    <Icon>',
        '      <href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>',
        '    </Icon>',
        '  </IconStyle>',
        '  <LabelStyle>',
        '    <scale>1</scale>',
        '  </LabelStyle>',
        '</Style>',
        '<StyleMap id="icon-1577-FF9800">',
        '  <Pair>',
        '    <key>normal</key>',
        '    <styleUrl>#icon-1577-FF9800-normal</styleUrl>',
        '  </Pair>',
        '  <Pair>',
        '    <key>highlight</key>',
        '    <styleUrl>#icon-1577-FF9800-highlight</styleUrl>',
        '  </Pair>',
        '</StyleMap>',
      ].join('\n'),
    )
  })

  it('uses the icon code in My Maps-compatible style ids', () => {
    let style = renderStyle('deep-purple-800', 'transportation-airport')

    expect(style).toContain('<StyleMap id="icon-1504-4527A0">')
    expect(style).toContain('<color>ffa02745</color>')
    expect(style).toContain(
      '<href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>',
    )
  })
})
