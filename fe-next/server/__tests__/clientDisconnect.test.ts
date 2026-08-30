import { describe, it, expect } from 'vitest';
import { isClientDisconnectError } from '../clientDisconnect';

/**
 * A client that vanishes mid-request must not kill the server.
 *
 * Node raises `Error: aborted` from `abortIncoming` (node:_http_server) when a
 * socket dies with a request still in flight — a closed tab, a navigation during
 * a slow compile, a reload. There is no listener on that stream, so it surfaces
 * as an *uncaught exception*, and `registerProcessErrorHandlers` treated every
 * uncaught exception as fatal and called `process.exit(1)`.
 *
 * The consequence is not theoretical: during development a single browser
 * navigating away repeatedly killed the dev server, and behind a process manager
 * in production the same thing reads as unexplained restarts. Worse, each one
 * fired an ops alert, so routine client behaviour paged a human.
 *
 * These errors are socket-level, not application-state corruption, so they are
 * logged and swallowed. Everything else keeps the existing fatal path — the
 * "unknown state, so exit" rule is still right for genuine bugs.
 */
function errWith(props: Partial<NodeJS.ErrnoException> & { stack?: string }): Error {
  const e = new Error(props.message ?? 'boom');
  Object.assign(e, props);
  return e;
}

describe('isClientDisconnectError', () => {
  it.each(['ECONNRESET', 'EPIPE', 'ECONNABORTED', 'ERR_STREAM_PREMATURE_CLOSE'])(
    'treats %s as a client disconnect',
    (code) => {
      expect(isClientDisconnectError(errWith({ code }))).toBe(true);
    },
  );

  it('recognises the bare `aborted` error Node throws from abortIncoming', () => {
    const e = errWith({
      message: 'aborted',
      stack: 'Error: aborted\n    at abortIncoming (node:_http_server:838:17)',
    });
    expect(isClientDisconnectError(e)).toBe(true);
  });

  it('does NOT swallow a real application error', () => {
    expect(isClientDisconnectError(errWith({ message: 'Cannot read properties of undefined' }))).toBe(false);
  });

  it('does NOT swallow an unrelated errno, however socket-ish it looks', () => {
    // ENOTFOUND is a DNS failure reaching a dependency, not a client hanging up.
    // Swallowing it would hide a genuinely broken deployment.
    expect(isClientDisconnectError(errWith({ code: 'ENOTFOUND' }))).toBe(false);
  });

  it('does NOT match a message that merely mentions aborting', () => {
    // Guard against matching on the word alone — only the real abortIncoming
    // stack counts, otherwise an app error saying "upload aborted" gets eaten.
    expect(isClientDisconnectError(errWith({ message: 'aborted' }))).toBe(false);
  });

  it('tolerates a null or non-Error value without throwing', () => {
    expect(isClientDisconnectError(null as unknown as Error)).toBe(false);
    expect(isClientDisconnectError('nope' as unknown as Error)).toBe(false);
  });
});
