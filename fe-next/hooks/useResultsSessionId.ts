'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

/** The player's results hand-off drops the server's round id, and the classroom chest is keyed by it. */
export function useResultsSessionId(socket: Pick<Socket, 'on' | 'off'> | null): number | null {
  const [id, setId] = useState<number | null>(null);
  useEffect(() => {
    if (!socket) return;
    const onResults = (data?: { gameSessionId?: unknown }) => {
      if (typeof data?.gameSessionId === 'number') setId(data.gameSessionId);
    };
    socket.on('validatedScores', onResults);
    return () => {
      socket.off('validatedScores', onResults);
    };
  }, [socket]);
  return id;
}

export function withResultsSessionId<T extends { gameSessionId?: number } | null>(results: T, sessionId: number | null): T {
  if (!results || results.gameSessionId != null || sessionId == null) return results;
  return { ...results, gameSessionId: sessionId };
}
