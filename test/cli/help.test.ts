import { describe, expect, it } from 'vitest'

import { getCommandUsage, helpMessage } from '../../cli/help'

describe('help', () => {
  it('builds the general CLI help message', () => {
    expect(helpMessage).toMatchInlineSnapshot(`
      "Usage: pinbook <command> [options]

      Build Google My Maps-ready KML from a readable YAML map config.

      Commands:
        build [path]        Build \`index.yaml\` into \`.pinbook/map.kml\`
        create [directory]  Scaffold a new Pinbook map project

      Flags:
        -h, --help
        -v, --version"
    `)
  })

  it('builds build command usage', () => {
    expect(getCommandUsage('build')).toBe(
      [
        'Usage: pinbook build [path]',
        '',
        'Build `index.yaml` into `.pinbook/map.kml` for Google My Maps.',
      ].join('\n'),
    )
  })

  it('builds create command usage', () => {
    expect(getCommandUsage('create')).toBe(
      [
        'Usage: pinbook create [directory]',
        '',
        'Scaffold a new Pinbook YAML map project.',
      ].join('\n'),
    )
  })
})
