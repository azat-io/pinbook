import { describe, expect, it } from 'vitest'

import { resolutionCacheSchema } from '../../schema/resolution-cache-schema'

describe('resolutionCacheSchema', () => {
  it('parses a valid cache file and applies defaults', () => {
    expect(
      resolutionCacheSchema.parse({
        version: 1,
      }),
    ).toEqual({
      addresses: {},
      version: 1,
    })
  })

  it('parses a cache file with resolved addresses', () => {
    expect(
      resolutionCacheSchema.parse({
        addresses: {
          'Senso-ji, Tokyo': [35.7148, 139.7967],
        },
        version: 1,
      }),
    ).toEqual({
      addresses: {
        'Senso-ji, Tokyo': [35.7148, 139.7967],
      },
      version: 1,
    })
  })

  it('rejects unknown root properties', () => {
    expect(
      resolutionCacheSchema.safeParse({
        updatedAt: '2026-03-15',
        addresses: {},
        version: 1,
      }),
    ).toMatchObject({
      error: {
        issues: [
          expect.objectContaining({
            code: 'unrecognized_keys',
            keys: ['updatedAt'],
          }),
        ],
      },
      success: false,
    })
  })
})
