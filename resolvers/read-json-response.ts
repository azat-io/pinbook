/**
 * Reads and parses a JSON HTTP response, falling back to raw text when the body
 * is not valid JSON.
 *
 * @param response - HTTP response to parse.
 * @returns Parsed JSON payload or an object containing the raw message text.
 */
export async function readJsonResponse(response: Response): Promise<unknown> {
  let responseText = await response.text()

  if (responseText === '') {
    return {}
  }

  try {
    return JSON.parse(responseText) as unknown
  } catch {
    return {
      message: responseText,
    }
  }
}
