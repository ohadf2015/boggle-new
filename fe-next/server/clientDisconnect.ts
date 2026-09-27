/**
 * Classify errors caused by a client vanishing mid-request.
 *
 * Node raises these as *uncaught exceptions* — the request stream errors with no
 * listener attached — so without this the process-level handler in
 * `lifecycle.ts` treats a closed browser tab as fatal and exits.
 *
 * Kept in its own module (no redis/Sentry imports) so it stays unit-testable.
 */

/** errno codes a dead peer produces. Deliberately narrow. */
const CLIENT_DISCONNECT_CODES: ReadonlySet<string> = new Set([
  'ECONNRESET',              // peer reset the connection
  'EPIPE',                   // wrote to a socket the peer already closed
  'ECONNABORTED',            // connection aborted before completion
  'ERR_STREAM_PREMATURE_CLOSE', // stream ended before it finished
]);

/**
 * True when `error` is a client hanging up rather than a bug in our code.
 *
 * Matching is intentionally strict. A bare `Error: aborted` is only accepted
 * when the stack actually comes from Node's HTTP server teardown — matching the
 * word alone would swallow an application error such as "upload aborted", and
 * silently eating real errors is far worse than an extra restart.
 */
export function isClientDisconnectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = (error as NodeJS.ErrnoException).code;
  if (typeof code === 'string' && CLIENT_DISCONNECT_CODES.has(code)) return true;

  const { message, stack } = error as Error;
  return message === 'aborted' && /abortIncoming|_http_server/.test(stack ?? '');
}
