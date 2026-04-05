import { describe, expect, it } from 'vitest'

import { requireGoogleDriveConfig } from '../../resolvers/require-google-drive-config'

describe('requireGoogleDriveConfig', () => {
  it('throws when required Google Drive variables are missing', () => {
    let thrownError: unknown

    try {
      requireGoogleDriveConfig({})
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toMatchObject({
      missingVariables: [
        'GOOGLE_DRIVE_CLIENT_ID',
        'GOOGLE_DRIVE_CLIENT_SECRET',
        'GOOGLE_DRIVE_REFRESH_TOKEN',
      ],
      name: 'GoogleDriveConfigurationError',
    })
  })

  it('returns a normalized config without folderId when it is absent', () => {
    expect(
      requireGoogleDriveConfig({
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
      }),
    ).toEqual({
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      clientId: 'client-id',
    })
  })

  it('keeps folderId when it is present', () => {
    expect(
      requireGoogleDriveConfig({
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        clientId: 'client-id',
        folderId: 'folder-id',
      }),
    ).toEqual({
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      clientId: 'client-id',
      folderId: 'folder-id',
    })
  })
})
