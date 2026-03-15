import { log } from '@clack/prompts'
import fs from 'node:fs/promises'
import prettier from 'prettier'
import path from 'node:path'

import { icons } from '../data/icons'

let outputDirectoryPath = path.join(
  process.cwd(),
  'skills',
  'references',
  'icons',
)

/**
 * Generates AI-facing icon reference documentation from the normalized icon
 * registry.
 */
async function generateIconsReference(): Promise<void> {
  let categories = [...new Set(icons.map(icon => icon.category))].toSorted(
    (left, right) => left.localeCompare(right),
  )

  let categoryMetadata = categories.map(category => ({
    icons: icons
      .filter(icon => icon.category === category)
      .toSorted((left, right) => left.code.localeCompare(right.code)),
    fileName: `${category
      .toLowerCase()
      .replaceAll(/[^\da-z]+/gu, '-')
      .replaceAll(/^-+|-+$/gu, '')}.md`,
    category,
  }))

  let indexTableHeader = [
    '| category | icons | file |',
    '| --- | ---: | --- |',
  ].join('\n')

  let indexTableRows = categoryMetadata
    .map(
      category =>
        `| ${category.category} | ${category.icons.length} | [\`${category.fileName}\`](./${category.fileName}) |`,
    )
    .join('\n')

  let indexContent = `
# Available Icons

Use only \`pin.icon\` id values from this reference.

Rules:

- Always emit the canonical \`id\`, not the display name.
- Use \`code\` only for debugging or Google My Maps / KML comparisons.
- Prefer named icons when one clearly matches the place.
- Open the category file that matches the target place type before choosing an icon.

PinBook currently exposes ${icons.length} icons across ${categoryMetadata.length} categories.

${indexTableHeader}
${indexTableRows}
`.trimStart()

  let indexFilePath = path.join(outputDirectoryPath, 'index.md')
  let formattedIndexContent = await prettier.format(indexContent, {
    ...(await prettier.resolveConfig(indexFilePath)),
    filepath: indexFilePath,
  })

  await fs.mkdir(outputDirectoryPath, { recursive: true })
  await fs.writeFile(indexFilePath, formattedIndexContent, 'utf8')

  await Promise.all(
    categoryMetadata.map(async category => {
      let categoryTableHeader = [
        '| id | name | code |',
        '| --- | --- | --- |',
      ].join('\n')

      let categoryTableRows = category.icons
        .map(icon => `| \`${icon.id}\` | ${icon.name} | \`${icon.code}\` |`)
        .join('\n')

      let categoryContent = `
# ${category.category}

Use \`id\` values from this category when setting \`pin.icon\`.

Rules:

- \`id\` is the canonical value to emit.
- \`name\` is only a human hint for selection.
- \`code\` exists for debugging and Google My Maps / KML matching.

${categoryTableHeader}
${categoryTableRows}
`.trimStart()

      let categoryFilePath = path.join(outputDirectoryPath, category.fileName)
      let formattedCategoryContent = await prettier.format(categoryContent, {
        ...(await prettier.resolveConfig(categoryFilePath)),
        filepath: categoryFilePath,
      })

      await fs.writeFile(categoryFilePath, formattedCategoryContent, 'utf8')
    }),
  )
}

try {
  await generateIconsReference()
  log.success('Icons reference generated successfully.')
} catch (error) {
  let errorMessage =
    error instanceof Error ? error.message : 'Unknown error occurred.'

  log.error(`Error generating icons reference: ${errorMessage}`)
}
