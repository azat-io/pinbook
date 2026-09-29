/**
 * Creates a fetch response whose body is the JSON-serialized value.
 *
 * @param body - Value to serialize as the response body.
 * @param status - HTTP status code of the response.
 * @returns Response with a JSON body.
 */
export function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
  })
}
