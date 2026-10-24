/**
 * Request/response over the friends:* socket events.
 *
 * Friend writes made through the socket get server-side side effects the direct
 * Supabase path cannot: push + live notification to the other player, Redis
 * friendship-cache invalidation, and the Families Policy gate. The socket has no
 * ack, so this correlates the emit with its success event (or a rejection).
 *
 * `fallback: true` means "the server did not decide" (timeout, socket not
 * authenticated yet) — the caller may retry via the direct-DB path. A result
 * without `fallback` is a definitive answer and must not be retried.
 */
import type { Socket } from 'socket.io-client';

export interface FriendsSocketResult {
  success: boolean;
  error?: string;
  code?: string;
  fallback?: boolean;
}

interface Options {
  successEvent: string;
  /** Extra success events (e.g. a send that was auto-accepted). */
  alsoSuccessOn?: string[];
  /** Ignore success events that belong to another in-flight request. */
  match?: (payload: unknown) => boolean;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 4000;

type Listener = (payload?: unknown) => void;

export function friendsSocketRequest(
  socket: Pick<Socket, 'emit' | 'on' | 'off'>,
  event: string,
  payload: unknown,
  { successEvent, alsoSuccessOn = [], match, timeoutMs = DEFAULT_TIMEOUT_MS }: Options
): Promise<FriendsSocketResult> {
  return new Promise((resolve) => {
    const successEvents = [successEvent, ...alsoSuccessOn];
    const cleanups: Array<() => void> = [];
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (result: FriendsSocketResult) => {
      if (timer) clearTimeout(timer);
      cleanups.forEach((fn) => fn());
      resolve(result);
    };
    const listen = (name: string, handler: Listener) => {
      socket.on(name, handler);
      cleanups.push(() => socket.off(name, handler));
    };

    for (const name of successEvents) {
      listen(name, (data) => {
        if (match && !match(data)) return;
        settle({ success: true });
      });
    }

    listen('friends:error', (data) => {
      const { code, message } = (data ?? {}) as { code?: string; message?: string };
      settle({ success: false, code, error: message });
    });

    // Policy/auth failures come through the generic error channel (emitError).
    listen('error', (data) => {
      const { code, message } = (data ?? {}) as { code?: string; message?: string };
      if (code === 'AUTH_REQUIRED') {
        settle({ success: false, fallback: true });
      } else if (code === 'SOCIAL_RESTRICTED') {
        settle({ success: false, code, error: message });
      }
    });

    listen('rateLimited', () => settle({ success: false, code: 'RATE_LIMITED', error: 'Too many requests — slow down' }));

    timer = setTimeout(() => settle({ success: false, fallback: true }), timeoutMs);

    socket.emit(event, payload);
  });
}
