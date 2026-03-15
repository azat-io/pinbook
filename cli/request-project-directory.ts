import { isCancel, text } from '@clack/prompts'

/**
 * Requests a target directory for a new Pinbook map project.
 *
 * @returns Trimmed directory path or `null` when the prompt is canceled.
 */
export async function requestProjectDirectory(): Promise<string | null> {
  let promptedDirectoryPath = await text({
    validate(value) {
      return !value || value.trim() === '' ?
          'Directory name is required.'
        : undefined
    },
    message: 'Enter a directory name for the new map project:',
  })

  if (isCancel(promptedDirectoryPath)) {
    return null
  }

  return promptedDirectoryPath.trim()
}
