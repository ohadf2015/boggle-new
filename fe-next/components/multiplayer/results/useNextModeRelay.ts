'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

interface Options<M extends string> {
  socket: Socket | null;
  gameCode?: string;
  isHost: boolean;
  pick: M;
  /** Off in a classroom: the teacher's pick goes through the classroom mode switch. */
  enabled: boolean;
}

/** Host sends its next-round pick to the room; a joiner pulls the current one on mount and follows each change. */
export function useNextModeRelay<M extends string>({ socket, gameCode, isHost, pick, enabled }: Options<M>): M | null {
  const [relayed, setRelayed] = useState<M | null>(null);

  useEffect(() => {
    if (!enabled || !socket || !isHost || !gameCode) return;
    socket.emit('updateNextMode', { gameCode, mode: pick });
  }, [enabled, socket, isHost, gameCode, pick]);

  useEffect(() => {
    if (!enabled || !socket || isHost) return undefined;
    const onNextMode = (data: unknown) => {
      const payload = data as { gameCode?: string; mode?: M } | undefined;
      if (!payload?.mode || (gameCode && payload.gameCode !== gameCode)) return;
      setRelayed(payload.mode);
    };
    socket.on('nextMode', onNextMode);
    socket.emit('requestNextMode');
    return () => {
      socket.off('nextMode', onNextMode);
    };
  }, [enabled, socket, isHost, gameCode]);

  return relayed;
}
