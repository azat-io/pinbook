import { isCancel, password, text, log } from '@clack/prompts'

/**
 * Requests Google Drive OAuth desktop client credentials from the user.
 *
 * @returns Credentials or `null` when the prompt is canceled.
 */
export async function requestGoogleDriveClientCredentials(): Promise<{
  clientSecret: string
  clientId: string
} | null> {
  log.info(
    'Google Drive uploads need an OAuth desktop client from Google Cloud Console.',
  )

  let clientId = await text({
    validate(value) {
      return (value ?? '').trim() === '' ?
          'Google Drive client ID is required.'
        : undefined
    },
    message: 'Enter your Google Drive OAuth client ID:',
  })

  if (isCancel(clientId)) {
    return null
  }

  let clientSecret = await password({
    validate(value) {
      return (value ?? '').trim() === '' ?
          'Google Drive client secret is required.'
        : undefined
    },
    message: 'Enter your Google Drive OAuth client secret:',
    mask: '*',
  })

  if (isCancel(clientSecret)) {
    return null
  }

  return {
    clientSecret: clientSecret.trim(),
    clientId: clientId.trim(),
  }
}
