'use client';

import { useEffect, useState } from 'react';
import type { ShiritoriSocketLike } from './useShiritoriGame';

/** Snapshot pushed by the server (gameStartHandler + requestShiritoriState). */
export interface ShiritoriInitPayload {
  players: string[];
  currentPlayer: string | null;
  requiredHead: string | null;
  chain: string[];
  eliminated: string[];
  finished: boolean;
  winner: string | null;
}

/**
 * Polls the server for the initial shiritori snapshot. The MP view only mounts
 * after `startGame`, so it can't read the roster/turn from the start payload —
 * it requests state on mount (and re-requests on reconnect) and waits for the
 * `shiritoriInit` broadcast. Returns null until the snapshot arrives, then the
 * roster/turn/chain to seed useShiritoriGame. Mirrors WheelRushView's pattern.
 */
export function useShiritoriInit(socket: ShiritoriSocketLike | null): ShiritoriInitPayload | null {
  const [init, setInit] = useState<ShiritoriInitPayload | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onInit = (raw: unknown) => setInit(raw as ShiritoriInitPayload);
    const request = () => socket.emit('requestShiritoriState', {});

    socket.on('shiritoriInit', onInit);
    socket.on('connect', request);
    request();

    return () => {
      socket.off('shiritoriInit', onInit);
      socket.off('connect', request);
    };
  }, [socket]);

  return init;
}
