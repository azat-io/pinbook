import { join } from 'node:path'

/**
 * Resolves the config file path used by commands that accept either a YAML file
 * path or a project directory.
 *
 * When no path is provided, `index.yaml` in the current working directory is
 * used. Paths without a YAML extension are treated as project directories and
 * resolved to `<directory>/index.yaml`.
 *
 * @param targetPath - Optional YAML config path or project directory path.
 * @returns Resolved config file path.
 */
export function resolveConfigFilePath(targetPath?: string): string {
  let normalizedTargetPath = targetPath?.trim()

  if (!normalizedTargetPath) {
    return 'index.yaml'
  }

  if (isYamlFilePath(normalizedTargetPath)) {
    return normalizedTargetPath
  }

  return join(normalizedTargetPath, 'index.yaml')
}

/**
 * Checks whether the provided path already looks like a YAML config file path.
 *
 * @param filePath - Candidate config file path.
 * @returns `true` when the path ends with `.yaml` or `.yml`.
 */
function isYamlFilePath(filePath: string): boolean {
  return /\.ya?ml$/iu.test(filePath)
}
