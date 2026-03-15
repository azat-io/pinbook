import { writeFile, access, mkdir, cp } from 'node:fs/promises'
import { resolve, join } from 'node:path'

import { readOptionalTextFile } from '../config/read-optional-text-file'

let pinbookAgentsBlockStart = '<!-- pinbook:start -->'
let pinbookAgentsBlockEnd = '<!-- pinbook:end -->'

/**
 * Sets up the local Pinbook skill files inside a generated project and ensures
 * the project-level `AGENTS.md` points AI agents to the copied skill.
 *
 * @param targetDirectoryPath - Absolute path to the created Pinbook project.
 */
export async function setupSkills(targetDirectoryPath: string): Promise<void> {
  let sourceSkillsDirectoryPath = await resolveSourceSkillsDirectoryPath()
  let targetSkillsDirectoryPath = join(targetDirectoryPath, 'skills', 'pinbook')
  let sourceSkillFilePath = join(sourceSkillsDirectoryPath, 'index.md')
  let sourceReferencesDirectoryPath = join(
    sourceSkillsDirectoryPath,
    'references',
  )
  let targetSkillFilePath = join(targetSkillsDirectoryPath, 'SKILL.md')
  let targetReferencesDirectoryPath = join(
    targetSkillsDirectoryPath,
    'references',
  )
  let agentsFilePath = join(targetDirectoryPath, 'AGENTS.md')

  await mkdir(targetSkillsDirectoryPath, {
    recursive: true,
  })
  await cp(sourceReferencesDirectoryPath, targetReferencesDirectoryPath, {
    recursive: true,
  })
  await cp(sourceSkillFilePath, targetSkillFilePath)
  await writeFile(
    agentsFilePath,
    renderAgentsFile(await readOptionalTextFile(agentsFilePath)),
    'utf8',
  )
}

/**
 * Renders the final `AGENTS.md` file content with the managed Pinbook
 * instruction block.
 *
 * @param currentContent - Existing `AGENTS.md` contents, if any.
 * @returns Updated `AGENTS.md` contents.
 */
function renderAgentsFile(currentContent: string): string {
  let pinbookAgentsBlock = [
    pinbookAgentsBlockStart,
    'Use `./skills/pinbook/SKILL.md` when creating, editing, or reviewing `index.yaml` in this Pinbook project.',
    'Use `./skills/pinbook/references/colors.md` for valid `pin.color` values.',
    'Use `./skills/pinbook/references/icons/index.md` for valid `pin.icon` ids.',
    pinbookAgentsBlockEnd,
  ].join('\n')

  if (currentContent === '') {
    return `${pinbookAgentsBlock}\n`
  }

  let managedBlockPattern =
    /<!-- pinbook:start -->[\s\S]*?<!-- pinbook:end -->/u

  if (managedBlockPattern.test(currentContent)) {
    return `${currentContent.replace(managedBlockPattern, pinbookAgentsBlock).trimEnd()}\n`
  }

  return `${currentContent.trimEnd()}\n\n${pinbookAgentsBlock}\n`
}

/**
 * Resolves the directory that contains the source Pinbook skill markdown files.
 * This supports both the source tree and the published `dist` layout.
 *
 * @returns Absolute path to the source skills directory.
 */
async function resolveSourceSkillsDirectoryPath(): Promise<string> {
  let currentDirectoryPath = import.meta.dirname
  let candidateDirectoryPaths = [
    currentDirectoryPath,
    resolve(currentDirectoryPath, '..', '..', 'skills'),
  ]
  let candidateStates = await Promise.all(
    candidateDirectoryPaths.map(async directoryPath => ({
      hasSourceSkills: await directoryContainsSourceSkills(directoryPath),
      directoryPath,
    })),
  )
  let matchingCandidateState = candidateStates.find(
    candidateState => candidateState.hasSourceSkills,
  )

  if (matchingCandidateState) {
    return matchingCandidateState.directoryPath
  }

  throw new Error('Pinbook skill sources could not be found.')
}

/**
 * Checks whether a file system path exists.
 *
 * @param path - File or directory path to check.
 * @returns `true` when the path exists and `false` when it is missing.
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)

    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

/**
 * Checks whether a directory contains the source Pinbook skill files.
 *
 * @param directoryPath - Candidate directory path.
 * @returns `true` when the directory contains `index.md` and `references/`.
 */
async function directoryContainsSourceSkills(
  directoryPath: string,
): Promise<boolean> {
  return (
    (await pathExists(join(directoryPath, 'index.md'))) &&
    (await pathExists(join(directoryPath, 'references')))
  )
}
