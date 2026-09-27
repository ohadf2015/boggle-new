'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

/**
 * How long we wait for the server to confirm a removal before showing a retry.
 *
 * `backend/handlers/kickHandler.ts` answers a `kickPlayer` it refuses with a
 * bare `return` — no error, no ack, seven separate ways (rate limit, unknown
 * socket, not host, self-kick, unknown target...). A UI that trusted the emit
 * would spin forever on the projector, which is exactly the silent-failure
 * shape of recurring-pitfall Class 4. The success signal is the `playerKicked`
 * broadcast; anything else times out into a visible, retryable failure.
 */
export const KICK_ACK_TIMEOUT_MS = 6_000;

export type KickStatus = 'idle' | 'removing' | 'failed';

interface UseKickStudentResult {
  /** Emit the removal for one student. Safe to call without a socket. */
  kick: (username: string) => void;
  /** Per-student state for the roster row. */
  statusOf: (username: string) => KickStatus;
}

/**
 * Client emitter for the host-only `kickPlayer` socket event.
 *
 * The server handler has existed with no caller at all; this is the only
 * emitter outside the pre-game lobby roster.
 */
export function useKickStudent(socket: Socket | null | undefined): UseKickStudentResult {
  const [statuses, setStatuses] = useState<Record<string, KickStatus>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearTimer = useCallback((username: string) => {
    const timer = timersRef.current[username];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[username];
    }
  }, []);

  // Success signal: the server broadcast, never the emit itself.
  useEffect(() => {
    if (!socket) return;
    const onKicked = (payload: { username?: string } | undefined) => {
      const username = payload?.username;
      if (!username) return;
      clearTimer(username);
      setStatuses((prev) => {
        if (!prev[username]) return prev;
        const next = { ...prev };
        delete next[username];
        return next;
      });
    };
    socket.on('playerKicked', onKicked);
    return () => {
      socket.off('playerKicked', onKicked);
    };
  }, [socket, clearTimer]);

  // Drop every pending timer on unmount so a late fire can't setState on a
  // dead component (the strip unmounts the moment the round ends).
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      Object.keys(timers).forEach((key) => delete timers[key]);
    };
  }, []);

  const kick = useCallback(
    (username: string) => {
      if (!socket || !username) return;
      clearTimer(username);
      setStatuses((prev) => ({ ...prev, [username]: 'removing' }));
      socket.emit('kickPlayer', { targetUsername: username });
      timersRef.current[username] = setTimeout(() => {
        delete timersRef.current[username];
        setStatuses((prev) => (prev[username] === 'removing' ? { ...prev, [username]: 'failed' } : prev));
      }, KICK_ACK_TIMEOUT_MS);
    },
    [socket, clearTimer],
  );

  const statusOf = useCallback((username: string): KickStatus => statuses[username] ?? 'idle', [statuses]);

  return { kick, statusOf };
}

export default useKickStudent;
