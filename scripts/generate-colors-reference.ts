import { log } from '@clack/prompts'
import fs from 'node:fs/promises'
import prettier from 'prettier'
import path from 'node:path'

import { colors } from '../data/colors'

let outputFilePath = path.join(
  process.cwd(),
  'skills',
  'pinbook',
  'references',
  'colors.md',
)

let supportedTones = [400, 500, 600, 700, 800, 900] as const

/**
 * Generates AI-facing color reference documentation from the normalized color
 * palette.
 */
async function generateColorsReference(): Promise<void> {
  let tableHeader = [
    '| id | name | 400 | 500 | 600 | 700 | 800 | 900 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ].join('\n')

  let tableRows = colors
    .map(
      color =>
        `| \`${color.id}\` | ${color.name} | ${supportedTones
          .map(tone => `\`${color.id}-${tone}\``)
          .join(' | ')} |`,
    )
    .join('\n')

  let content = `
# Available Colors

Use only \`color-tone\` values when setting \`pin.color\`.

Rules:

- Never use bare color ids like \`red\` or \`blue\`.
- Supported tones: \`400\`, \`500\`, \`600\`, \`700\`, \`800\`, \`900\`.
- Prefer \`500\` unless a lighter or darker tone is explicitly needed.

The table below lists the canonical values that AI should emit.

${tableHeader}
${tableRows}
`.trimStart()
  let formattedContent = await prettier.format(content, {
    ...(await prettier.resolveConfig(outputFilePath)),
    filepath: outputFilePath,
  })

  await fs.mkdir(path.dirname(outputFilePath), { recursive: true })
  await fs.writeFile(outputFilePath, formattedContent, 'utf8')
}

try {
  await generateColorsReference()
  log.success('Colors reference generated successfully.')
} catch (error) {
  let errorMessage =
    error instanceof Error ? error.message : 'Unknown error occurred.'

  log.error(`Error generating colors reference: ${errorMessage}`)
}
