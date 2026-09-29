import type { Mock } from 'vitest'

import assert from 'node:assert/strict'

/**
 * Returns the URL object that was passed to a recorded fetch call.
 *
 * @param fetchMock - Mocked fetch function that recorded the call.
 * @param callIndex - Zero-based fetch call index.
 * @returns Request URL of the fetch call.
 */
export function getFetchCallUrl(
  fetchMock: Mock<typeof fetch>,
  callIndex: number,
): URL {
  let input = fetchMock.mock.calls[callIndex]?.[0]

  assert(
    input instanceof URL,
    `Expected fetch call ${callIndex} to receive a URL.`,
  )

  return input
}
