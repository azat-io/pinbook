import { describe, expect, it } from 'vitest'

import { readJsonResponse } from '../../resolvers/read-json-response'

describe('readJsonResponse', () => {
  it('returns an empty object for an empty response body', async () => {
    await expect(readJsonResponse(new Response(''))).resolves.toEqual({})
  })

  it('parses a JSON response body', async () => {
    await expect(
      readJsonResponse(
        new Response(JSON.stringify({ message: 'hello' }), {
          status: 200,
        }),
      ),
    ).resolves.toEqual({
      message: 'hello',
    })
  })

  it('falls back to a raw text message when the body is not valid JSON', async () => {
    await expect(
      readJsonResponse(
        new Response('not-json', {
          status: 500,
        }),
      ),
    ).resolves.toEqual({
      message: 'not-json',
    })
  })
})
