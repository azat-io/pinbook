import { writeFile, access, mkdir } from 'node:fs/promises'
import { basename, resolve, join } from 'node:path'
import { cancel, log } from '@clack/prompts'

import { ensureGitIgnoreEntries } from '../config/ensure-gitignore-entries'
import { requestProjectDirectory } from '../cli/request-project-directory'
import { setupSkills } from '../skills/setup-skills'
import { version } from '../package.json'

/**
 * Creates a new Pinbook project scaffold in the target directory.
 *
 * @param targetPath - Optional directory path for the new project.
 */
export async function create(targetPath?: string): Promise<void> {
  let targetDirectoryPath = await resolveCreateTargetDirectoryPath(targetPath)

  if (targetDirectoryPath === null) {
    cancel('Create canceled.')
    process.exitCode = 1

    return
  }

  let configFilePath = join(targetDirectoryPath, 'index.yaml')
  let packageJsonFilePath = join(targetDirectoryPath, 'package.json')
  let existingProjectFilePath = await findExistingProjectFilePath([
    configFilePath,
    packageJsonFilePath,
  ])

  if (existingProjectFilePath) {
    log.error(`Project already exists: ${existingProjectFilePath}`)
    process.exitCode = 1

    return
  }

  await mkdir(targetDirectoryPath, {
    recursive: true,
  })
  await writeFile(
    configFilePath,
    renderStarterMapConfig(getDefaultMapTitle(targetDirectoryPath)),
    'utf8',
  )
  await writeFile(
    packageJsonFilePath,
    renderStarterPackageJson(getDefaultPackageName(targetDirectoryPath)),
    'utf8',
  )
  await ensureGitIgnoreEntries(targetDirectoryPath, ['.pinbook/', '.env'])
  await setupSkills(targetDirectoryPath)

  log.success(`Created Pinbook map project at ${targetDirectoryPath}.`)
  log.info(`Edit ${configFilePath} and add at least one pin in YAML.`)
  log.info(
    `AI skill: ${join(targetDirectoryPath, 'skills', 'pinbook', 'SKILL.md')}`,
  )
  log.info('Run: pnpm install')
  log.info('Run: pnpm build')
  log.info('Import: .pinbook/map.kml into Google My Maps')
}

/**
 * Builds the starter YAML config written by `pinbook create`.
 *
 * @param title - Human-readable default map title.
 * @returns Starter YAML config.
 */
function renderStarterMapConfig(title: string): string {
  return [
    'map:',
    `  title: ${JSON.stringify(title)}`,
    '  description: >',
    '    Replace with a short description of this map.',
    '',
    'layers: []',
    '',
    'pins: []',
    '# Add at least one pin before running `pinbook build`.',
    '# Prefer address over coords when possible.',
    '# Example:',
    '# - id: first-stop',
    '#   title: Tokyo Tower',
    '#   address: Tokyo Tower, Tokyo',
    '#   color: red-500',
    '#   icon: places-viewpoint',
    '#   description: >',
    '#     Replace with a short note.',
    '#   photo: https://example.com/photos/tokyo-tower.jpg',
    '',
  ].join('\n')
}

/**
 * Derives a default human-readable map title from the target directory name.
 *
 * @param directoryPath - Absolute target directory path.
 * @returns Default map title for the starter config.
 */
function getDefaultMapTitle(directoryPath: string): string {
  let directoryName = basename(directoryPath)
  let normalizedDirectoryName = directoryName
    .replaceAll(/(?<=[0-9a-z])(?=[A-Z])/gu, ' ')
    .replaceAll(/[-._]+/gu, ' ')
    .trim()

  if (normalizedDirectoryName === '') {
    return 'Untitled Map'
  }

  return normalizedDirectoryName
    .split(/\s+/u)
    .map(
      word => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join(' ')
}

/**
 * Derives a default package name from the target directory name.
 *
 * @param directoryPath - Absolute target directory path.
 * @returns Normalized npm package name for the starter project.
 */
function getDefaultPackageName(directoryPath: string): string {
  let directoryName = basename(directoryPath)
  let normalizedPackageName = directoryName
    .replaceAll(/(?<=[0-9a-z])(?=[A-Z])/gu, '-')
    .replaceAll(/[\s._]+/gu, '-')
    .replaceAll(/-+/gu, '-')
    .replaceAll(/^-|-$/gu, '')
    .toLowerCase()

  if (normalizedPackageName === '') {
    return 'pinbook-map'
  }

  return normalizedPackageName
}

/**
 * Builds the starter `package.json` written by `pinbook create`.
 *
 * @param projectName - Normalized package name for the new project.
 * @returns Starter `package.json` contents.
 */
function renderStarterPackageJson(projectName: string): string {
  return `${JSON.stringify(
    /* eslint-disable perfectionist/sort-objects */
    {
      name: projectName,
      private: true,
      scripts: {
        build: 'pinbook build',
      },
      dependencies: {
        pinbook: version,
      },
    },
    /* eslint-enable perfectionist/sort-objects */
    null,
    2,
  )}\n`
}

/**
 * Resolves the final target directory for the `create` command, prompting the
 * user when no directory argument was provided.
 *
 * @param targetPath - Optional directory path passed from the CLI.
 * @returns Absolute target directory path or `null` when the prompt is
 *   canceled.
 */
async function resolveCreateTargetDirectoryPath(
  targetPath?: string,
): Promise<string | null> {
  let normalizedTargetPath = targetPath?.trim()

  if (normalizedTargetPath) {
    return resolve(normalizedTargetPath)
  }

  let promptedDirectoryPath = await requestProjectDirectory()

  if (promptedDirectoryPath === null) {
    return null
  }

  return resolve(promptedDirectoryPath)
}

/**
 * Returns the first scaffold file that already exists in the target directory.
 *
 * @param filePaths - Candidate scaffold file paths.
 * @returns The first existing file path or `null` when none exist.
 */
async function findExistingProjectFilePath(
  filePaths: string[],
): Promise<string | null> {
  let existingFileStates = await Promise.all(
    filePaths.map(async filePath => ({
      exists: await fileExists(filePath),
      filePath,
    })),
  )
  let existingFileState = existingFileStates.find(fileState => fileState.exists)

  return existingFileState?.filePath ?? null
}

/**
 * Checks whether a file already exists on disk.
 *
 * @param filePath - Path to the file that should be checked.
 * @returns `true` when the file exists and `false` when it is missing.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)

    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}
